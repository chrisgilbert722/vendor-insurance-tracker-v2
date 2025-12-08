// pages/api/requirements/check.js
// ============================================================
// REQUIREMENTS CHECK ENDPOINT — V5 CINEMATIC BUILD
// Fixes:
//  - Missing API route
//  - HTML returned instead of JSON
//  - Compliance Summary failing in Fix Cockpit
//  - Policy field mismatches (uses your REAL DB columns)
// ============================================================

import { Client } from "pg";
import { detectConflicts } from "./../../requirements-v5/conflicts"; // import your conflict logic
// If conflicts.js does NOT export detectConflicts separately,
// we will adjust this import — let me know.

// ============================================================
// CONNECT TO NEON (SSL SAFE)
// ============================================================
function getClient() {
  return new Client({
    connectionString:
      process.env.POSTGRES_URL_NO_SSL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// ============================================================
// LOAD REQUIREMENT RULES (V5 uses requirements_rules_v2 + groups)
// ============================================================
async function loadRules(orgId) {
  const client = getClient();
  await client.connect();

  try {
    const groupsRes = await client.query(
      `SELECT id, name 
       FROM requirements_groups_v2 
       WHERE org_id = $1
       ORDER BY id ASC`,
      [orgId]
    );

    const rulesRes = await client.query(
      `SELECT *
       FROM requirements_rules_v2
       WHERE group_id IN (
         SELECT id FROM requirements_groups_v2 WHERE org_id = $1
       ) 
       ORDER BY id ASC`,
      [orgId]
    );

    return {
      groups: groupsRes.rows,
      rules: rulesRes.rows
    };
  } finally {
    await client.end();
  }
}

// ============================================================
// POLICY → RULE CHECKER (NO missing DB columns)
// ============================================================
// This evaluates rules against REAL policy fields.
// Your policies table has EXACTLY:
// id, created_at, vendor_id, org_id, expiration_date,
// coverage_type, status, vendor_name, policy_number,
// carrier, effective_date
// ============================================================
function evaluateRulesAgainstPolicies(policies, rules) {
  const failing = [];

  for (const rule of rules) {
    const field = rule.field_key;
    const operator = rule.operator;
    const expected = rule.expected_value;

    // VENDOR HAS MULTIPLE POLICIES, CHECK EACH
    let policyMatched = false;

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

      // If we can't evaluate the rule, skip
      if (value === null || value === undefined) continue;

      const vString = String(value).toLowerCase();
      const eString = String(expected).toLowerCase();

      let pass = true;

      switch (operator) {
        case "equals":
          pass = vString === eString;
          break;
        case "not_equals":
          pass = vString !== eString;
          break;
        case "contains":
          pass = vString.includes(eString);
          break;
        case "gte":
          pass = Number(value) >= Number(expected);
          break;
        case "lte":
          pass = Number(value) <= Number(expected);
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
            .includes(vString);
          break;
        default:
          pass = true;
      }

      if (!pass) {
        failing.push({
          ruleId: rule.id,
          field_key: field,
          operator,
          expected,
          value,
          message: rule.requirement_text || "Requirement not met",
          severity: rule.severity || "required"
        });
      } else {
        policyMatched = true;
      }
    }

    // If no policy satisfied this rule
    if (!policyMatched) {
      failing.push({
        ruleId: rule.id,
        field_key: field,
        operator,
        expected,
        value: null,
        message: rule.requirement_text || "Requirement not met",
        severity: rule.severity || "required"
      });
    }
  }

  return failing;
}

// ============================================================
// MAIN API HANDLER FOR /api/requirements/check
// ============================================================
export default async function handler(req, res) {
  try {
    const { vendorId, orgId } = req.query;

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId",
        failingRules: [],
        conflicts: []
      });
    }

    // ==============================================
    // LOAD VENDOR + POLICIES
    // ==============================================
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
        conflicts: []
      });
    }

    const vendor = vendorRes.rows[0];

    const policiesRes = await client.query(
      `SELECT *
       FROM policies
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [vendorId]
    );

    const policies = policiesRes.rows;

    await client.end();

    // ==============================================
    // LOAD RULE ENGINE V5 RULES
    // ==============================================
    const { groups, rules } = await loadRules(orgId);

    // ==============================================
    // 1) EVALUATE RULES
    // ==============================================
    const failingRules = evaluateRulesAgainstPolicies(policies, rules);

    // ==============================================
    // 2) DETECT LOGICAL RULE CONFLICTS
    // ==============================================
    const conflicts = detectConflicts(groups, rules);

    // ==============================================
    // CLEAN JSON RESPONSE FOR FIX COCKPIT
    // ==============================================
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      failingRules,
      conflicts,
      policiesCount: policies.length
    });
  } catch (err) {
    console.error("CHECK API ERROR:", err);
    return res.status(200).json({
      ok: false,
      error: err.message,
      failingRules: [],
      conflicts: []
    });
  }
}
