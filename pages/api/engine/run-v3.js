// pages/api/engine/run-v3.js
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    /* -----------------------------------------------------------
       1. LOAD ALL VENDORS
    ----------------------------------------------------------- */
    const { data: vendors, error: vErr } = await supabase
      .from("vendors")
      .select("id, org_id, name, category, is_active");

    if (vErr) throw vErr;


    /* -----------------------------------------------------------
       2. LOAD ALL RULES (JOIN GROUPS SO WE CAN FILTER BY ORG)
    ----------------------------------------------------------- */
    const { data: allRules, error: rErr } = await supabase
      .from("requirements_rules_v2")
      .select(`
        id,
        group_id,
        field_key,
        operator,
        expected_value,
        severity,
        requirement_text,
        internal_note,
        is_active,
        group:requirements_groups_v2(id, name, org_id)
      `);

    if (rErr) throw rErr;


    let alertsToInsert = [];
    let cacheUpdates = [];


    /* -----------------------------------------------------------
       3. LOOP THROUGH VENDORS
    ----------------------------------------------------------- */
    for (const vendor of vendors) {
      const vendorId = vendor.id;
      const vendorOrg = vendor.org_id;

      // RULES FOR THIS ORG ONLY
      const rules = allRules.filter(
        (r) => r.group && r.group.org_id === vendorOrg
      );

      /* -----------------------------------------------------------
         LOAD CERTIFICATE EXTRACTED DATA
      ----------------------------------------------------------- */
      const { data: certificates } = await supabase
        .from("certificate_extracted")
        .select("*")
        .eq("vendor_id", vendorId);

      let missing = [];
      let failing = [];
      let passing = [];

      const hasCert = certificates && certificates.length > 0;


      /* -----------------------------------------------------------
         4. EVALUATE EACH RULE FOR THIS VENDOR
      ----------------------------------------------------------- */
      for (const rule of rules) {
        if (!rule.is_active) continue;

        // If vendor has no certificate → everything becomes missing
        if (!hasCert) {
          missing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
            detail: "No certificate on file",
          });
          continue;
        }

        const value = extractValue(certificates, rule.field_key);

        // Missing field case
        if (value === null || value === undefined) {
          missing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
            detail: "Missing field",
          });
          continue;
        }

        // Evaluate rule
        const passed = evaluateRule(rule, value);

        if (!passed) {
          failing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
            expected: rule.expected_value,
            found: value,
            severity: rule.severity,
          });

          // CREATE ALERT
          alertsToInsert.push({
            vendor_id: vendorId,
            org_id: vendorOrg,
            rule_id: rule.id,
            group_id: rule.group_id,
            type: "rule_fail",
            severity: rule.severity || "Medium",
            title: `Rule Failed: ${rule.requirement_text || rule.field_key}`,
            message: `Expected ${rule.expected_value}, but found ${value}.`,
            rule_label: rule.requirement_text || rule.field_key,
            status: "open",
          });
        } else {
          passing.push({
            rule_id: rule.id,
            rule: rule.requirement_text || rule.field_key,
          });
        }
      }


      /* -----------------------------------------------------------
         5. UPDATE COMPLIANCE SNAPSHOT CACHE
      ----------------------------------------------------------- */
      cacheUpdates.push({
        vendor_id: vendorId,
        org_id: vendorOrg,
        missing,
        failing,
        passing,
        summary:
          failing.length
            ? `${failing.length} failing / ${missing.length} missing`
            : missing.length
            ? `${missing.length} missing`
            : "PASS",
        status: failing.length ? "fail" : "pass",
        last_checked_at: new Date().toISOString(),
      });
    }


    /* -----------------------------------------------------------
       6. INSERT ALERTS (NEW ALERTS ONLY)
    ----------------------------------------------------------- */
    for (const alert of alertsToInsert) {
      await supabase.from("alerts").insert(alert);
    }


    /* -----------------------------------------------------------
       7. UPDATE vendor_compliance_cache TABLE
    ----------------------------------------------------------- */
    for (const c of cacheUpdates) {
      await supabase
        .from("vendor_compliance_cache")
        .upsert(c, { onConflict: "vendor_id" });
    }


    return res.status(200).json({
      ok: true,
      vendors_evaluated: vendors.length,
      rules_evaluated: allRules.length,
      alerts_created: alertsToInsert.length,
    });
  } catch (err) {
    console.error("ENGINE ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}


/* -----------------------------------------------------------
   VALUE EXTRACTOR
----------------------------------------------------------- */
function extractValue(certificates, key) {
  try {
    const extracted = certificates?.[0]?.extracted || {};
    return extracted[key] ?? null;
  } catch (e) {
    return null;
  }
}


/* -----------------------------------------------------------
   RULE EVALUATOR
----------------------------------------------------------- */
function evaluateRule(rule, value) {
  const op = rule.operator;
  const expected = rule.expected_value;

  if (value === null) return false;

  switch (op) {
    case "=":
      return `${value}` == `${expected}`;
    case "!=":
      return `${value}` != `${expected}`;
    case ">":
      return Number(value) > Number(expected);
    case "<":
      return Number(value) < Number(expected);
    case ">=":
      return Number(value) >= Number(expected);
    case "<=":
      return Number(value) <= Number(expected);
    case "contains":
      return `${value}`.toLowerCase().includes(`${expected}`.toLowerCase());
    default:
      return false;
  }
}
