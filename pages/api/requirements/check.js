// pages/api/requirements/check.js
// ============================================================
// REQUIREMENTS CHECK ENDPOINT — V5
// Fixes compliance summary for Fix Cockpit V5
// ============================================================

import { Client } from "pg";
import { detectConflicts } from "../requirements-v5/conflicts";

// CONNECTOR
function getClient() {
  return new Client({
    connectionString:
      process.env.POSTGRES_URL_NO_SSL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

// LOAD RULES FOR ORG
async function loadRules(orgId) {
  const client = getClient();
  await client.connect();

  const groupsRes = await client.query(
    `SELECT id, name FROM requirements_groups_v2 WHERE org_id = $1 ORDER BY id ASC`,
    [orgId]
  );

  const rulesRes = await client.query(
    `SELECT * FROM requirements_rules_v2 WHERE group_id IN (
        SELECT id FROM requirements_groups_v2 WHERE org_id = $1
     ) ORDER BY id ASC`,
    [orgId]
  );

  await client.end();

  return { groups: groupsRes.rows, rules: rulesRes.rows };
}

// POLICY EVALUATOR (matches your REAL DB schema)
function evaluateRulesAgainstPolicies(policies, rules) {
  const failing = [];

  for (const rule of rules) {
    const field = rule.field_key;
    const operator = rule.operator;
    const expected = rule.expected_value;

    let matched = false;

    for (const p of policies) {
      const value =
        field === "policy.expiration_date"
          ? p.expiration_date
          : field === "policy.coverage_type"
          ? p.coverage_type
          : field === "policy.carrier"
          ? p.carrier
          : field === "policy.policy_number"
          ? p.policy_number
          : field === "policy.effective_date"
          ? p.effective_date
          : null;

      if (value === null || value === undefined) continue;

      let pass = true;

      switch (operator) {
        case "equals":
          pass = String(value).toLowerCase() === String(expected).toLowerCase();
          break;
        case "not_equals":
          pass = String(value).toLowerCase() !== String(expected).toLowerCase();
          break;
        case "gte":
          pass = Number(value) >= Number(expected);
          break;
        case "lte":
          pass = Number(value) <= Number(expected);
          break;
        case "contains":
          pass = String(value).toLowerCase().includes(String(expected).toLowerCase());
          break;
        case "before":
          pass = new Date(value) < new Date(expected);
          break;
        case "after":
          pass = new Date(value) > new Date(expected);
          break;
        case "in_list":
          pass = expected
            .split(",")
            .map((x) => x.trim().toLowerCase())
            .includes(String(value).toLowerCase());
          break;
      }

      if (!pass) {
        failing.push({
          ruleId: rule.id,
          field_key: field,
          operator,
          expected,
          value,
          severity: rule.severity,
          message: rule.requirement_text || "Requirement not met",
        });
      } else {
        matched = true;
      }
    }

    if (!matched) {
      failing.push({
        ruleId: rule.id,
        field_key: field,
        operator,
        expected,
        value: null,
        severity: rule.severity,
        message: rule.requirement_text || "Requirement not met",
      });
    }
  }

  return failing;
}

// ============================================================
// MAIN API
// ============================================================
export default async function handler(req, res) {
  try {
    const { vendorId, orgId } = req.query;

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId",
        failingRules: [],
        conflicts: [],
      });
    }

    // Load vendor + policies
    const client = getClient();
    await client.connect();

    const vendorRes = await client.query(
      `SELECT * FROM vendors WHERE id = $1 LIMIT 1`,
      [vendorId]
    );
    if (vendorRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found",
        failingRules: [],
        conflicts: [],
      });
    }

    const policiesRes = await client.query(
      `SELECT * FROM policies WHERE vendor_id = $1 ORDER BY created_at DESC`,
      [vendorId]
    );
    await client.end();

    const policies = policiesRes.rows;

    // Load Rules
    const { groups, rules } = await loadRules(orgId);

    // Evaluate rules + conflicts
    const failingRules = evaluateRulesAgainstPolicies(policies, rules);
    const conflicts = detectConflicts(groups, rules);

    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      failingRules,
      conflicts,
      policiesCount: policies.length,
    });
  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: err.message || "Server error",
      failingRules: [],
      conflicts: [],
    });
  }
}
