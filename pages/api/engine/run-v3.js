// pages/api/engine/run-v3.js
// NEW Neon-based Rule Engine V3 (per-vendor evaluator)

import { sql } from "../../../lib/db";          // adjust path if your db helper lives elsewhere
import { supabase } from "../../../lib/supabaseClient";

/* ============================================================
   HELPER: Flatten policies.extracted JSON into one object
   (re-using your existing pattern, but now feeding Neon rules)
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
   RULE ENGINE V3 EVALUATOR
   - Uses Neon tables:
     • rule_groups
     • rules_v3
     • rule_results_v3
   - Reads policy data from Supabase (policies.extracted)
   - Writes alerts into Neon vendor_alerts
============================================================ */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { vendorId, orgId } = req.body;

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId in body.",
      });
    }

    const now = new Date();

    /* --------------------------------------------------------
       1) LOAD POLICY DATA (from Supabase)
    --------------------------------------------------------- */
    const { data: policies, error: pErr } = await supabase
      .from("policies")
      .select("id, extracted")
      .eq("vendor_id", vendorId);

    if (pErr) {
      console.error("[RULE V3] Error loading policies from Supabase:", pErr);
      return res.status(500).json({ ok: false, error: "Failed to load policies." });
    }

    const hasPolicies = policies && policies.length > 0;
    const policyObj = hasPolicies ? buildPolicyObj(policies) : {};

    /* --------------------------------------------------------
       2) LOAD RULE GROUPS + RULES (from Neon)
    --------------------------------------------------------- */
    const groups = await sql`
      SELECT id, org_id, label, description, severity, active
      FROM rule_groups
      WHERE org_id = ${orgId} AND active = TRUE
      ORDER BY id ASC;
    `;

    if (!groups.length) {
      return res.status(200).json({
        ok: true,
        message: "No active rule groups for this org.",
        results: [],
        failed: 0,
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
        message: "No active rules for this org.",
        results: [],
        failed: 0,
      });
    }

    /* --------------------------------------------------------
       3) EVALUATE RULES
    --------------------------------------------------------- */
    const results = [];

    for (const rule of rules) {
      let passed = true;

      const field = rule.field;          // e.g. "general_liability_limit"
      const cond = rule.condition;       // e.g. "gte", "exists"
      const val = rule.value;            // expected value
      const actual = policyObj[field];   // from flattened extracted COI

      switch (rule.type) {
        case "coverage":
          if (cond === "exists") passed = actual !== undefined && actual !== null && actual !== "";
          if (cond === "missing") passed = actual === undefined || actual === null || actual === "";
          break;

        case "limit": {
          const numeric = Number(actual || 0);
          const limit = Number(val || 0);
          if (cond === "gte") passed = numeric >= limit;
          if (cond === "lte") passed = numeric <= limit;
          break;
        }

        case "endorsement": {
          const endorsements = Array.isArray(policyObj.endorsements)
            ? policyObj.endorsements
            : [];
          if (cond === "requires") passed = endorsements.includes(val);
          if (cond === "missing") passed = !endorsements.includes(val);
          break;
        }

        case "date": {
          const date = actual ? new Date(actual) : null;
          const compare = val ? new Date(val) : null;
          if (!date || !compare || Number.isNaN(date.getTime()) || Number.isNaN(compare.getTime())) {
            passed = false;
          } else {
            if (cond === "before") passed = date < compare;
            if (cond === "after") passed = date > compare;
          }
          break;
        }

        case "custom":
          // Placeholder for AI-powered or JS-expression rules
          passed = true;
          break;

        default:
          passed = true;
      }

      results.push({
        ruleId: rule.id,
        passed,
        message: rule.message,
        severity: rule.severity,
      });
    }

    /* --------------------------------------------------------
       4) WRITE RULE RESULTS (rule_results_v3 in Neon)
    --------------------------------------------------------- */
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

    /* --------------------------------------------------------
       5) GENERATE ALERTS FOR FAILED RULES (Neon vendor_alerts)
    --------------------------------------------------------- */
    // clear old rule-based alerts for this vendor
    await sql`
      DELETE FROM vendor_alerts
      WHERE vendor_id = ${vendorId};
    `;

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

    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      rulesEvaluated: results.length,
      failedCount: failed.length,
      results,
    });
  } catch (err) {
    console.error("[RULE ENGINE V3 Neon ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Rule Engine V3 failed.",
    });
  }
}

