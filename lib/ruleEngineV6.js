// lib/ruleEngineV6.js
// Rule Engine V6 — Document-aware rules → compliance + alerts

import { sql } from "./db";
import { insertAlertV2Safe } from "./alertsV2Engine";

/**
 * Utility: safely read nested value from extracted doc
 * path example: "coverage.gl.each_occurrence"
 */
function getValueByPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const p of parts) {
    if (current == null) return undefined;
    current = current[p];
  }
  return current;
}

/**
 * Evaluate a single rule against extracted document JSON
 * rule: row from requirement_rules
 * doc: extracted document structure from doc-intake
 */
function evaluateRuleOnDoc(rule, doc) {
  const { field_key, operator, expected_value } = rule;
  const actual = getValueByPath(doc, field_key);

  // normalize values
  const exp = expected_value;
  const act = actual;

  let passed = true;

  switch (operator) {
    case "equals":
      passed = act == exp;
      break;
    case "not_equals":
      passed = act != exp;
      break;
    case "gte":
      passed = Number(act) >= Number(exp);
      break;
    case "lte":
      passed = Number(act) <= Number(exp);
      break;
    case "contains":
      if (Array.isArray(act)) {
        passed = act.includes(exp);
      } else if (typeof act === "string") {
        passed = act.toLowerCase().includes(String(exp).toLowerCase());
      } else {
        passed = false;
      }
      break;
    default:
      passed = true;
  }

  const detail = {
    field_key,
    operator,
    expected_value: exp,
    actual_value: act,
  };

  return { passed, detail };
}

/**
 * Run all rules for org on an extracted doc and emit:
 * - vendor_compliance_cache update
 * - alerts in alerts_v2 for failing rules
 */
export async function runRulesOnExtractedDocument({
  orgId,
  vendorId,
  policyId,
  extracted,
}) {
  if (!orgId || !vendorId || !extracted) return;

  // 1) Load rules
  const rules = await sql`
    SELECT *
    FROM requirement_rules
    WHERE org_id = ${orgId}
      AND is_active = TRUE
  `;

  const failing = [];
  const passing = [];
  const missing = []; // for future if we add presence rules

  // 2) Evaluate rules
  for (const rule of rules) {
    const { passed, detail } = evaluateRuleOnDoc(rule, extracted);

    const ruleSummary = {
      rule_id: rule.id,
      field_key: rule.field_key,
      operator: rule.operator,
      expected_value: rule.expected_value,
      severity: rule.severity || "medium",
      detail,
      requirement_text: rule.requirement_text || "",
    };

    if (passed) {
      passing.push(ruleSummary);
    } else {
      failing.push(ruleSummary);

      // Create alert for failing rule
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "rule_fail_doc",
        severity: rule.severity || "high",
        category: "rule",
        message:
          rule.requirement_text ||
          `Rule failed on ${rule.field_key} (${rule.operator} ${rule.expected_value})`,
        ruleId: rule.id,
        metadata: {
          policyId,
          field_key: rule.field_key,
          operator: rule.operator,
          expected_value: rule.expected_value,
          actual_value: detail.actual_value,
        },
      });
    }
  }

  // 3) Update vendor_compliance_cache
  const passingCount = passing.length;
  const failingCount = failing.length;
  const status =
    failingCount > 0 ? "fail" : passingCount > 0 ? "pass" : "unknown";

  const summary = `Document-based rules evaluated: ${passingCount} passing, ${failingCount} failing. Status: ${status}.`;

  // check existing row
  const existing = await sql`
    SELECT id
    FROM vendor_compliance_cache
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId}
    LIMIT 1;
  `;

  if (existing.length) {
    await sql`
      UPDATE vendor_compliance_cache
      SET failing = ${failing},
          passing = ${passing},
          missing = ${missing},
          status = ${status},
          summary = ${summary},
          last_checked_at = NOW()
      WHERE id = ${existing[0].id};
    `;
  } else {
    await sql`
      INSERT INTO vendor_compliance_cache (
        org_id, vendor_id, last_checked_at,
        failing, passing, missing, status, summary
      )
      VALUES (
        ${orgId}, ${vendorId}, NOW(),
        ${failing}, ${passing}, ${missing}, ${status}, ${summary}
      );
    `;
  }

  return { failing, passing, missing, status, summary };
}
