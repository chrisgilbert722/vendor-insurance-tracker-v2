// pages/api/engine/run-v3.js
// Rule Engine V3 — Coverage Requirements Evaluator
//
// POST /api/engine/run-v3
// Body: { vendorId, orgId, dryRun?: boolean }
//
// Does:
// 1) Load vendor's policies
// 2) Load org's requirements_v5
// 3) Evaluate missing coverage, low limits, expired policies
// 4) Writes rule_results_v3 (unless dryRun)
// 5) Returns globalScore (0–100) + failing details

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

function numericOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function computeScoreFromFailures(failures = []) {
  // Start from 100, subtract weight per failure by severity
  let score = 100;

  for (const f of failures) {
    const sev = (f.severity || "").toLowerCase();
    if (sev === "critical") score -= 35;
    else if (sev === "high") score -= 25;
    else if (sev === "medium") score -= 15;
    else if (sev === "low") score -= 5;
    else score -= 5;
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "POST only" });
  }

  try {
    const { vendorId, orgId, dryRun } = req.body || {};

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId.",
      });
    }

    // ---------------------------------------------------
    // 1) Load vendor policies
    // ---------------------------------------------------
    const policies = await sql`
      SELECT
        id,
        vendor_id,
        coverage_type,
        expiration_date,
        limit_each_occurrence,
        auto_limit,
        work_comp_limit,
        umbrella_limit
      FROM policies
      WHERE vendor_id = ${vendorId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    if (!policies.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        globalScore: 0,
        failedCount: 0,
        totalRules: 0,
        failingRules: [],
        passingRules: [],
        warning: "No policies found for vendor.",
      });
    }

    // Normalize policies by coverage_type
    const policiesByType = {};
    for (const p of policies) {
      const t = (p.coverage_type || "").toLowerCase();
      if (!t) continue;
      if (!policiesByType[t]) policiesByType[t] = [];
      policiesByType[t].push(p);
    }

    // ---------------------------------------------------
    // 2) Load org coverage requirements (requirements_v5)
    // ---------------------------------------------------
    const requirements = await sql`
      SELECT id, coverage_type, min_limit, severity, active
      FROM requirements_v5
      WHERE org_id = ${orgId} AND active = TRUE;
    `;

    if (!requirements.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        globalScore: 100,
        failedCount: 0,
        totalRules: 0,
        failingRules: [],
        passingRules: [],
        warning: "No active requirements defined for this org.",
      });
    }

    const failures = [];
    const passes = [];

    const now = new Date();

    // ---------------------------------------------------
    // 3) Evaluate each requirement against policies
    // ---------------------------------------------------
    for (const req of requirements) {
      const covType = (req.coverage_type || "").toLowerCase();
      const severity = req.severity || "medium";
      const minLimit = numericOrNull(req.min_limit);

      const pols = policiesByType[covType] || [];

      if (!pols.length) {
        failures.push({
          requirementId: req.id,
          coverageType: req.coverage_type,
          severity,
          message: `Missing ${req.coverage_type} coverage.`,
        });
        continue;
      }

      // Pick the best policy candidate (e.g., highest limit)
      let primary = pols[0];
      if (pols.length > 1) {
        primary = pols.reduce((best, cur) => {
          const bestLimit =
            numericOrNull(best.limit_each_occurrence) || 0;
          const curLimit =
            numericOrNull(cur.limit_each_occurrence) || 0;
          return curLimit > bestLimit ? cur : best;
        }, primary);
      }

      const limit =
        numericOrNull(primary.limit_each_occurrence) ||
        numericOrNull(primary.auto_limit) ||
        numericOrNull(primary.work_comp_limit) ||
        numericOrNull(primary.umbrella_limit);

      const messagesForReq = [];
      let passed = true;

      // Limit check
      if (minLimit !== null && limit !== null && limit < minLimit) {
        passed = false;
        messagesForReq.push(
          `${req.coverage_type} limit (${limit.toLocaleString()}) is below required minimum (${minLimit.toLocaleString()}).`
        );
      }

      // Expiration check
      if (primary.expiration_date) {
        const exp = new Date(primary.expiration_date);
        if (!isNaN(exp.getTime())) {
          if (exp < now) {
            passed = false;
            messagesForReq.push(
              `${req.coverage_type} policy is expired (${exp.toLocaleDateString()}).`
            );
          } else {
            const daysLeft = Math.floor(
              (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysLeft <= 30) {
              // Not a full failure, but we could tag as warning — for now, log as pass with note
              messagesForReq.push(
                `${req.coverage_type} policy expires soon (${daysLeft} day(s) left).`
              );
            }
          }
        }
      }

      if (passed) {
        passes.push({
          requirementId: req.id,
          coverageType: req.coverage_type,
          message:
            messagesForReq.join(" ") ||
            `${req.coverage_type} coverage meets requirements.`,
        });
      } else {
        failures.push({
          requirementId: req.id,
          coverageType: req.coverage_type,
          severity,
          message:
            messagesForReq.join(" ") ||
            `${req.coverage_type} coverage does not meet requirements.`,
        });
      }
    }

    // ---------------------------------------------------
    // 4) Write rule_results_v3 (unless dryRun = true)
    // ---------------------------------------------------
    if (!dryRun) {
      await sql`
        DELETE FROM rule_results_v3
        WHERE vendor_id = ${vendorId} AND org_id = ${orgId};
      `;

      for (const f of failures) {
        await sql`
          INSERT INTO rule_results_v3 (
            org_id,
            vendor_id,
            requirement_id,
            passed,
            severity,
            message
          )
          VALUES (
            ${orgId},
            ${vendorId},
            ${f.requirementId},
            FALSE,
            ${f.severity},
            ${f.message}
          )
        `;
      }

      for (const p of passes) {
        await sql`
          INSERT INTO rule_results_v3 (
            org_id,
            vendor_id,
            requirement_id,
            passed,
            severity,
            message
          )
          VALUES (
            ${orgId},
            ${vendorId},
            ${p.requirementId},
            TRUE,
            NULL,
            ${p.message}
          )
        `;
      }

      // optional: log to system_timeline
      const globalScore = computeScoreFromFailures(failures);
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId},
          ${vendorId},
          'rule_engine_v3_run',
          ${'Rule Engine V3 evaluated. Score: ' + globalScore},
          ${failures.length ? "warning" : "info"}
        )
      `;
    }

    const globalScore = computeScoreFromFailures(failures);

    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      globalScore,
      failedCount: failures.length,
      totalRules: requirements.length,
      failingRules: failures,
      passingRules: passes,
    });
  } catch (err) {
    console.error("[engine/run-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Rule Engine V3 failed.",
    });
  }
}
