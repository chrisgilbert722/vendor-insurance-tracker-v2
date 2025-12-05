// pages/api/engine/run-v3.js
// ============================================================
// Rule Engine V5 Backend (running behind the old run-v3 route)
//
// POST /api/engine/run-v3
// Body: { vendorId, orgId, dryRun?: boolean }
//
// Does:
// 1) Load vendor's policies (policies table)
// 2) Load org's V5 rules (requirements_rules_v2)
// 3) Evaluate each rule against ALL policies
//    - A rule PASSES if ANY policy satisfies it
// 4) Writes rule_results_v3 (unless dryRun)
// 5) Tries to update vendor_compliance_cache (wrapped in try/catch)
// 6) Logs to system_timeline
// 7) Returns globalScore (0–100) + passing/failing rule details
// ============================================================

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

// ---------------------------
// UTILITIES
// ---------------------------
function computeScoreFromFailures(failures = []) {
  // Same scoring model as your original V3 engine
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

// Guess type from field_key
function inferType(fieldKey) {
  if (!fieldKey) return "string";
  const key = fieldKey.toLowerCase();
  if (key.includes("date")) return "date";
  if (key.includes("limit") || key.includes("amount") || key.includes("gl"))
    return "number";
  return "string";
}

// Map V5 rule field_key → policy row value
function resolvePolicyValue(policy, fieldKey) {
  if (!fieldKey) return undefined;

  let key = fieldKey;
  if (key.startsWith("policy.")) {
    key = key.split(".").slice(1).join(".");
  }

  // Explicit mappings from V5 UI field options → DB columns
  if (key === "coverage_type") return policy.coverage_type;
  if (key === "expiration_date") return policy.expiration_date;
  if (key === "effective_date") return policy.effective_date;
  if (key === "carrier") return policy.carrier;
  if (key === "glEachOccurrence") return policy.limit_each_occurrence;
  // glAggregate is not in schema yet; adjust if you add it
  if (key === "glAggregate") return policy.gl_aggregate;

  // Fallback: try direct column name
  return policy[key];
}

function normalizeValue(raw, typeHint) {
  if (raw === null || raw === undefined) return null;

  if (typeHint === "number") {
    const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }

  if (typeHint === "date") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return String(raw).toLowerCase();
}

function evaluateRuleV5(rule, policy) {
  try {
    const typeHint = inferType(rule.field_key);
    const rawValue = resolvePolicyValue(policy, rule.field_key);
    const value = normalizeValue(rawValue, typeHint);
    const expected = normalizeValue(rule.expected_value, typeHint);

    switch (rule.operator) {
      case "equals":
        return value === expected;

      case "not_equals":
        return value !== expected;

      case "gte":
        return Number(value) >= Number(expected);

      case "lte":
        return Number(value) <= Number(expected);

      case "contains":
        return String(value || "").includes(String(expected || ""));

      case "in_list":
        return String(expected || "")
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .includes(String(value || ""));

      case "before":
        return typeHint === "date" && value && expected && value < expected;

      case "after":
        return typeHint === "date" && value && expected && value > expected;

      default:
        return false;
    }
  } catch (err) {
    console.error("[engine/run-v3 V5] evaluateRuleV5 error:", err);
    return false;
  }
}

function buildRuleLabel(rule) {
  const val = rule.expected_value;
  return `${rule.field_key} ${rule.operator} ${val}`;
}

// ---------------------------
// MAIN HANDLER
// ---------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
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
    // 1) Load vendor policies (real table: policies)
    // ---------------------------------------------------
    const policies = await sql`
      SELECT
        id,
        vendor_id,
        org_id,
        expiration_date,
        effective_date,
        coverage_type,
        status,
        vendor_name,
        policy_number,
        carrier,
        limit_each_occurrence,
        auto_limit,
        work_comp_limit,
        umbrella_limit
      FROM policies
      WHERE vendor_id = ${vendorId} AND org_id = ${orgId}
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

    // ---------------------------------------------------
    // 2) Load org V5 rules (requirements_rules_v2)
    // ---------------------------------------------------
    const rules = await sql`
      SELECT
        id,
        org_id,
        group_id,
        field_key,
        operator,
        expected_value,
        severity,
        requirement_text,
        is_active
      FROM requirements_rules_v2
      WHERE org_id = ${orgId}
      ORDER BY id ASC;
    `;

    // Only active rules (if is_active exists), otherwise all
    const activeRules = rules.filter((r) =>
      r.is_active === null || r.is_active === undefined ? true : !!r.is_active
    );

    if (!activeRules.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        globalScore: 100,
        failedCount: 0,
        totalRules: 0,
        failingRules: [],
        passingRules: [],
        warning: "No active V5 rules defined for this org.",
      });
    }

    const failures = [];
    const passes = [];

    // ---------------------------------------------------
    // 3) Evaluate each V5 rule against all policies
    //    Rule passes if ANY policy satisfies it
    // ---------------------------------------------------
    for (const rule of activeRules) {
      const severity = rule.severity || "medium";

      let passed = false;
      let matchedPolicy = null;

      for (const policy of policies) {
        const ok = evaluateRuleV5(rule, policy);
        if (ok) {
          passed = true;
          matchedPolicy = policy;
          break;
        }
      }

      const label =
        rule.requirement_text || buildRuleLabel(rule) || "Unnamed rule";

      if (passed) {
        passes.push({
          ruleId: rule.id,
          groupId: rule.group_id,
          severity,
          fieldKey: rule.field_key,
          operator: rule.operator,
          expectedValue: rule.expected_value,
          message: `Rule passed: ${label}`,
          policyId: matchedPolicy?.id || null,
          policyNumber: matchedPolicy?.policy_number || null,
        });
      } else {
        failures.push({
          ruleId: rule.id,
          groupId: rule.group_id,
          severity,
          fieldKey: rule.field_key,
          operator: rule.operator,
          expectedValue: rule.expected_value,
          message: `Rule failed: ${label} (no policy satisfied this condition)`,
        });
      }
    }

    const globalScore = computeScoreFromFailures(failures);

    // ---------------------------------------------------
    // 4) Persist results if NOT dryRun
    // ---------------------------------------------------
    if (!dryRun) {
      // 4a) rule_results_v3 — keep same behavior, now keyed to rule IDs
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
            ${f.ruleId},
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
            ${p.ruleId},
            TRUE,
            NULL,
            ${p.message}
          )
        `;
      }

      // 4b) system_timeline logging (same style as before)
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId},
          ${vendorId},
          'rule_engine_v5_run',
          ${"Rule Engine V5 evaluated. Score: " + globalScore},
          ${failures.length ? "warning" : "info"}
        )
      `;

      // 4c) vendor_compliance_cache — best-effort UPSERT
      // (wrapped in try/catch so mismatched columns won't break engine)
      try {
        // Adjust column names if your vendor_compliance_cache schema differs.
        await sql`
          INSERT INTO vendor_compliance_cache (
            vendor_id,
            org_id,
            score,
            last_run_at
          )
          VALUES (
            ${vendorId},
            ${orgId},
            ${globalScore},
            NOW()
          )
          ON CONFLICT (vendor_id)
          DO UPDATE SET
            score = EXCLUDED.score,
            last_run_at = EXCLUDED.last_run_at;
        `;
      } catch (cacheErr) {
        console.error(
          "[engine/run-v3 V5] vendor_compliance_cache upsert failed (adjust columns if needed):",
          cacheErr
        );
      }
    }

    // ---------------------------------------------------
    // 5) Return response
    // ---------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      globalScore,
      failedCount: failures.length,
      totalRules: activeRules.length,
      failingRules: failures,
      passingRules: passes,
    });
  } catch (err) {
    console.error("[engine/run-v3 V5] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Rule Engine V5 failed.",
    });
  }
}
