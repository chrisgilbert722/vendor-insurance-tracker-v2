// pages/api/engine/run-org-v3.js
// Neon-based Rule Engine V3 — Org-wide runner (iterates all vendors in an org)

import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";

// Coverage Normalization + Endorsement Matrix + Limit Engine
import { normalizeCOI } from "../../../lib/normalizeCOI";
import { checkMissingEndorsements } from "../../../lib/endorsementMatrix";
import { checkCoverageLimits } from "../../../lib/limitEngine";

/* ============================================================
   HELPER: Flatten policies.extracted JSON into one object
============================================================ */
function buildPolicyObj(policies = []) {
  const obj = {};
  for (const p of policies) {
    let extracted = p.extracted || {};
    if (typeof extracted === "string") {
      try {
        extracted = JSON.parse(extracted);
      } catch {
        extracted = {};
      }
    }
    if (extracted && typeof extracted === "object") {
      Object.assign(obj, extracted);
    }
  }
  return obj;
}

/* ============================================================
   HELPER: Severity weighting + group score
============================================================ */
function severityToWeight(severity) {
  switch (severity) {
    case "critical":
      return 1.0;
    case "high":
      return 0.7;
    case "medium":
      return 0.4;
    case "low":
      return 0.2;
    default:
      return 0.3;
  }
}

function computeGroupScore(ruleResults, groupSeverity) {
  if (!ruleResults || ruleResults.length === 0) {
    // No rules in this group — treat as neutral / pass
    return 100;
  }

  let score = 100;
  const groupWeight = severityToWeight(groupSeverity || "medium");

  for (const r of ruleResults) {
    if (r.passed) continue;
    const ruleWeight = severityToWeight(r.severity || "medium");
    const penalty = 15 * ruleWeight * groupWeight;
    score -= penalty;
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

/* ============================================================
   MAIN HANDLER — RUN FOR ALL VENDORS IN ORG
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, vendorIds } = req.body || {};

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in body.",
      });
    }

    // 1) Load rule groups + rules once per org
    const groups = await sql`
      SELECT id, org_id, label, description, severity, active
      FROM rule_groups
      WHERE org_id = ${orgId} AND active = TRUE
      ORDER BY id ASC;
    `;

    if (!groups.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        message: "No active rule groups for this org.",
        vendorsProcessed: 0,
        vendorSummaries: [],
      });
    }

    const rules = await sql`
      SELECT id, group_id, type, field, condition, value, message, severity, active
      FROM rules_v3
      WHERE group_id IN (
        SELECT id FROM rule_groups WHERE org_id = ${orgId} AND active = TRUE
      )
      AND active = TRUE
      ORDER BY id ASC;
    `;

    if (!rules.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        message: "No active rules for this org.",
        vendorsProcessed: 0,
        vendorSummaries: [],
      });
    }

    // 2) Determine which vendors to run for
    let vendorsToRun = [];

    if (Array.isArray(vendorIds) && vendorIds.length > 0) {
      // Explicit override
      vendorsToRun = vendorIds;
    } else {
      // Load vendors from Neon for this org
      const vendorRows = await sql`
        SELECT id
        FROM vendors
        WHERE org_id = ${orgId};
      `;
      vendorsToRun = vendorRows.map((v) => v.id);
    }

    if (!vendorsToRun.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        message: "No vendors found for this org.",
        vendorsProcessed: 0,
        vendorSummaries: [],
      });
    }

    const vendorSummaries = [];
    let totalFailedRules = 0;
    let totalAutoAlerts = 0;

    // 3) Run engine for each vendor
    for (const vendorId of vendorsToRun) {
      const summary = await runEngineForVendor(orgId, vendorId, groups, rules);
      vendorSummaries.push(summary);
      totalFailedRules += summary.failedRuleCount;
      totalAutoAlerts += summary.autoAlertCount;
    }

    return res.status(200).json({
      ok: true,
      orgId,
      vendorsProcessed: vendorSummaries.length,
      totalFailedRules,
      totalAutoAlerts,
      vendorSummaries,
    });
  } catch (err) {
    console.error("[engine/run-org-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Org-level Rule Engine V3 failed.",
    });
  }
}

/* ============================================================
   CORE ENGINE FOR A SINGLE VENDOR (same logic as run-v3)
============================================================ */
async function runEngineForVendor(orgId, vendorId, groups, rules) {
  // 1) Load policies for this vendor from Supabase
  const { data: policies, error: pErr } = await supabase
    .from("policies")
    .select("id, extracted")
    .eq("vendor_id", vendorId);

  if (pErr) {
    console.error(
      "[RULE V3 ORG] Error loading policies from Supabase:",
      vendorId,
      pErr
    );
    return {
      vendorId,
      orgId,
      ok: false,
      error: "Failed to load policies",
      rulesEvaluated: 0,
      failedRuleCount: 0,
      autoAlertCount: 0,
      globalScore: 100,
    };
  }

  const hasPolicies = policies && policies.length > 0;
  const policyObj = hasPolicies ? buildPolicyObj(policies) : {};

  // 2) Normalize coverage + endorsements + limits
  const normalized = normalizeCOI(policyObj);
  const profileType = "standard_construction";

  const missingEndorsements = checkMissingEndorsements(
    normalized,
    profileType
  );

  const autoGeneratedAlerts = [];

  if (!normalized.has_gl) {
    autoGeneratedAlerts.push({
      code: "MISSING_GL",
      message: "General Liability coverage is missing.",
      severity: "critical",
    });
  }
  if (!normalized.has_auto) {
    autoGeneratedAlerts.push({
      code: "MISSING_AUTO",
      message: "Automobile Liability coverage is missing.",
      severity: "high",
    });
  }
  if (!normalized.has_wc) {
    autoGeneratedAlerts.push({
      code: "MISSING_WC",
      message: "Workers Compensation coverage is missing.",
      severity: "high",
    });
  }
  if (missingEndorsements.length > 0) {
    autoGeneratedAlerts.push({
      code: "MISSING_ENDORSEMENTS",
      message: `Missing required endorsements: ${missingEndorsements.join(
        ", "
      )}`,
      severity: "high",
    });
  }

  const limitFailures = checkCoverageLimits(normalized, profileType);
  autoGeneratedAlerts.push(...limitFailures);

  // 3) Evaluate rules (same as run-v3)
  const results = [];

  for (const rule of rules) {
    let passed = true;

    const field = rule.field;
    const cond = rule.condition;
    const val = rule.value;

    const actual =
      policyObj[field] !== undefined
        ? policyObj[field]
        : normalized[field] !== undefined
        ? normalized[field]
        : undefined;

    switch (rule.type) {
      case "coverage":
        if (cond === "exists") {
          passed = actual !== undefined && actual !== null && actual !== "";
        }
        if (cond === "missing") {
          passed = actual === undefined || actual === null || actual === "";
        }
        break;

      case "limit": {
        const numeric = Number(actual || 0);
        const limit = Number(val || 0);
        if (cond === "gte") passed = numeric >= limit;
        if (cond === "lte") passed = numeric <= limit;
        break;
      }

      case "endorsement": {
        const endorsements = Array.isArray(normalized.endorsements)
          ? normalized.endorsements
          : [];
        const target = String(val || "").toUpperCase();
        if (cond === "requires") {
          passed = endorsements.includes(target);
        }
        if (cond === "missing") {
          passed = !endorsements.includes(target);
        }
        break;
      }

      case "date": {
        const date = actual ? new Date(actual) : null;
        const compare = val ? new Date(val) : null;
        if (
          !date ||
          !compare ||
          Number.isNaN(date.getTime()) ||
          Number.isNaN(compare.getTime())
        ) {
          passed = false;
        } else {
          if (cond === "before") passed = date < compare;
          if (cond === "after") passed = date > compare;
        }
        break;
      }

      case "custom":
        passed = true;
        break;

      default:
        passed = true;
    }

    results.push({
      ruleId: rule.id,
      groupId: rule.group_id,
      passed,
      message: rule.message,
      severity: rule.severity,
      field,
      condition: cond,
      actual,
      expected: val,
    });
  }

  // 4) Group-level scores + global score
  const groupResults = groups.map((g) => {
    const groupRuleResults = results.filter((r) => r.groupId === g.id);
    const failedRules = groupRuleResults.filter((r) => !r.passed);
    const passed = failedRules.length === 0;
    const score = computeGroupScore(groupRuleResults, g.severity);

    return {
      groupId: g.id,
      label: g.label,
      description: g.description,
      severity: g.severity,
      passed,
      score,
      failedRuleIds: failedRules.map((fr) => fr.ruleId),
    };
  });

  let globalScore = 100;
  if (groupResults.length > 0) {
    const total = groupResults.reduce((sum, gr) => sum + gr.score, 0);
    globalScore = Math.round(total / groupResults.length);
  }

  // 5) Persist rule results + alerts for this vendor
  await sql`
    DELETE FROM rule_results_v3
    WHERE vendor_id = ${vendorId};
  `;

  for (const r of results) {
    await sql`
      INSERT INTO rule_results_v3 (vendor_id, rule_id, passed, message, severity)
      VALUES (
        ${vendorId},
        ${r.ruleId},
        ${r.passed},
        ${r.message},
        ${r.severity}
      );
    `;
  }

  await sql`
    DELETE FROM vendor_alerts
    WHERE vendor_id = ${vendorId};
  `;

  for (const a of autoGeneratedAlerts) {
    await sql`
      INSERT INTO vendor_alerts (vendor_id, org_id, code, message, severity)
      VALUES (
        ${vendorId},
        ${orgId},
        ${a.code},
        ${a.message},
        ${a.severity}
      );
    `;
  }

  const failed = results.filter((r) => !r.passed);

  for (const f of failed) {
    await sql`
      INSERT INTO vendor_alerts (vendor_id, org_id, code, message, severity)
      VALUES (
        ${vendorId},
        ${orgId},
        ${"RULE_" + f.ruleId},
        ${f.message},
        ${f.severity}
      );
    `;
  }

  return {
    vendorId,
    orgId,
    ok: true,
    rulesEvaluated: results.length,
    failedRuleCount: failed.length,
    autoAlertCount: autoGeneratedAlerts.length,
    globalScore,
  };
}
