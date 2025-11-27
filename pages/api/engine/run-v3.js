// pages/api/engine/run-v3.js
import { supabase } from "../../../lib/supabaseClient";

export const config = {
  api: { bodyParser: true },
};

/* -----------------------------------------------------------
   HELPER: Build flattened policy object from JSON
------------------------------------------------------------*/
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
    Object.assign(obj, extracted);
  }
  return obj;
}

/* -----------------------------------------------------------
   HELPER: Basic operator evaluation
------------------------------------------------------------*/
function simpleCompare(operator, actual, expected) {
  switch (operator) {
    case "=":
    case "equals":
      return String(actual) == String(expected);

    case "!=":
    case "not_equals":
      return String(actual) != String(expected);

    case ">":
      return Number(actual) > Number(expected);

    case "<":
      return Number(actual) < Number(expected);

    case ">=":
    case "gte":
      return Number(actual) >= Number(expected);

    case "<=":
    case "lte":
      return Number(actual) <= Number(expected);

    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());

    default:
      return false;
  }
}

/* -----------------------------------------------------------
   HELPER: Evaluate rule + missing detection
------------------------------------------------------------*/
function evaluateRuleFull(rule, policyObj) {
  const conditions = Array.isArray(rule.conditions) && rule.conditions.length
    ? rule.conditions
    : [
        {
          field_key: rule.field_key,
          operator: rule.operator,
          expected_value: rule.expected_value,
        },
      ];

  const missing = [];

  // Detect missing fields
  for (const c of conditions) {
    const val = policyObj[c.field_key];
    if (val === undefined || val === null || val === "") {
      missing.push(c.field_key);
    }
  }

  if (missing.length > 0) {
    return { passed: false, missing, fail: false };
  }

  // Evaluate each condition
  let allPassed = true;
  for (const c of conditions) {
    const actual = policyObj[c.field_key];
    if (!simpleCompare(c.operator, actual, c.expected_value)) {
      allPassed = false;
      break;
    }
  }

  return { passed: allPassed, missing: [], fail: !allPassed };
}

/* -----------------------------------------------------------
   HELPER: Risk score calculator
------------------------------------------------------------*/
function computeRisk(failingCount, missingCount) {
  let score = 100;
  score -= failingCount * 20;
  score -= missingCount * 10;
  if (score < 0) score = 0;
  return score;
}

/* -----------------------------------------------------------
   ENGINE RUNNER (V3.5)
------------------------------------------------------------*/
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const now = new Date().toISOString();

    /* -----------------------------------------------------------
       1. Load ALL vendors
    ----------------------------------------------------------- */
    const { data: vendors, error: vErr } = await supabase
      .from("vendors")
      .select("id, org_id, name");

    if (vErr) throw vErr;

    /* -----------------------------------------------------------
       2. Load all rules w/ group join
    ----------------------------------------------------------- */
    const { data: rawRules, error: rErr } = await supabase
      .from("requirements_rules_v2")
      .select(`
        id,
        group_id,
        logic,
        conditions,
        field_key,
        operator,
        expected_value,
        severity,
        requirement_text,
        internal_note,
        is_active,
        group:requirements_groups_v2(id, name, org_id, is_active)
      `);

    if (rErr) throw rErr;

    const rules =
      rawRules?.map((r) => {
        let conditions = [];
        try {
          conditions = Array.isArray(r.conditions) ? r.conditions : [];
        } catch {
          conditions = [];
        }

        if (!conditions.length) {
          conditions = [
            {
              field_key: r.field_key,
              operator: r.operator,
              expected_value: r.expected_value,
            },
          ];
        }

        return {
          id: r.id,
          group_id: r.group_id,
          logic: r.logic || "all",
          conditions,
          field_key: r.field_key,
          operator: r.operator,
          expected_value: r.expected_value,
          severity: r.severity || "medium",
          requirement_text: r.requirement_text || "",
          internal_note: r.internal_note || "",
          is_active: r.is_active !== false,
          group: r.group,
        };
      }) || [];

    /* -----------------------------------------------------------
       Prepare accumulators
    ----------------------------------------------------------- */
    const alertsToInsert = [];
    const cacheRows = [];
    const riskRows = [];

    let totalRulesEvaluated = 0;

    /* -----------------------------------------------------------
       3. Evaluate vendor by vendor
    ----------------------------------------------------------- */
    for (const v of vendors) {
      const vendorId = v.id;
      const vendorOrgId = v.org_id;

      // Load policies
      const { data: policies, error: pErr } = await supabase
        .from("policies")
        .select("id, extracted")
        .eq("vendor_id", vendorId);

      if (pErr) {
        console.error("Error loading policies:", pErr);
        continue;
      }

      const hasPolicies = policies && policies.length > 0;
      const policyObj = hasPolicies ? buildPolicyObj(policies) : {};

      // Filter rules for org + active state
      const vendorRules = rules.filter(
        (r) =>
          r.is_active &&
          r.group &&
          r.group.org_id === vendorOrgId &&
          (r.group.is_active === null || r.group.is_active === true)
      );

      const missing = [];
      const failing = [];
      const passing = [];

      // Evaluate each rule
      for (const rule of vendorRules) {
        totalRulesEvaluated++;

        if (!hasPolicies) {
          missing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
            detail: "No policy uploaded",
          });
          continue;
        }

        const evaluation = evaluateRuleFull(rule, policyObj);

        if (evaluation.missing.length > 0) {
          missing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
            detail: `Missing fields: ${evaluation.missing.join(", ")}`,
          });
          continue;
        }

        if (!evaluation.passed) {
          failing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
            expected: rule.conditions[0]?.expected_value,
            found: policyObj[rule.conditions[0]?.field_key] ?? null,
            severity: rule.severity,
          });

          alertsToInsert.push({
            vendor_id: vendorId,
            org_id: vendorOrgId,
            rule_id: rule.id,
            group_id: rule.group_id,
            rule_name: rule.requirement_text || rule.field_key,
            vendor_name: v.name,
            severity: rule.severity || "medium",
            type: "rule_fail",
            status: "open",
            message: `Expected "${rule.conditions[0]?.expected_value}", found "${policyObj[rule.conditions[0]?.field_key] ?? "N/A"}".`,
            requirement_text: rule.requirement_text || null,
            field_key: rule.conditions[0]?.field_key,
            created_at: now,
            last_seen_at: now,
          });
        } else {
          passing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
          });
        }
      }

      // Summary + status
      const summary =
        failing.length > 0
          ? `${failing.length} failing / ${missing.length} missing`
          : missing.length > 0
          ? `${missing.length} missing`
          : "PASS";

      const status = failing.length > 0 ? "fail" : "pass";
      const riskScore = computeRisk(failing.length, missing.length);

      cacheRows.push({
        vendor_id: vendorId,
        org_id: vendorOrgId,
        missing,
        failing,
        passing,
        summary,
        status,
        last_checked_at: now,
        updated_at: now,
      });

      riskRows.push({
        vendor_id: vendorId,
        org_id: vendorOrgId,
        risk_score: riskScore,
        days_left: 0,
        elite_status:
          riskScore >= 90 ? "Elite" : riskScore >= 70 ? "Preferred" : "Watch",
        created_at: now,
      });
    }

    /* -----------------------------------------------------------
       4. INSERT ALERTS
    ----------------------------------------------------------- */
    if (alertsToInsert.length > 0) {
      const { error: aErr } = await supabase
        .from("alerts")
        .insert(alertsToInsert);
      if (aErr) console.error("Alert insert error", aErr);
    }

    /* -----------------------------------------------------------
       5. UPSERT VENDOR COMPLIANCE CACHE
    ----------------------------------------------------------- */
    for (const c of cacheRows) {
      const { error: cErr } = await supabase
        .from("vendor_compliance_cache")
        .upsert(c, { onConflict: "vendor_id" });
      if (cErr) console.error("Cache upsert error:", cErr);
    }

    /* -----------------------------------------------------------
       6. INSERT RISK HISTORY RECORDS
    ----------------------------------------------------------- */
    if (riskRows.length > 0) {
      const { error: rErr2 } = await supabase
        .from("risk_history")
        .insert(riskRows);
      if (rErr2) console.error("Risk history insert error", rErr2);
    }

    return res.status(200).json({
      ok: true,
      vendors_evaluated: vendors.length,
      rules_evaluated: totalRulesEvaluated,
      alerts_created: alertsToInsert.length,
    });
  } catch (err) {
    console.error("ENGINE V3.5 RUN ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message || "Engine failed" });
  }
}
