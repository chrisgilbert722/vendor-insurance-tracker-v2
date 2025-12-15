// pages/api/engine/run-v3.js
// ============================================================
// RULE ENGINE V5 — COVERAGE REQUIREMENTS + CONTRACT RULES
// Supabase Postgres UUID-safe patch:
// - orgId is UUID (string) everywhere
// - vendorId may be UUID or integer (we support both safely)
// - no Number(orgId)
// - skip engine cleanly when orgId missing (stops 400 spam)
// ============================================================

import { sql } from "../../../lib/db";
import { getContractRuleResultsForVendor } from "../../../lib/engineV5/contractRulesV5";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

/* ------------------------------------------------------------
   ID HELPERS (UUID-safe)
------------------------------------------------------------ */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanId(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return s;
}

function parseId(v) {
  const s = cleanId(v);
  if (!s) return null;
  if (UUID_RE.test(s)) return s; // UUID string
  if (/^\d+$/.test(s)) return Number(s); // integer id
  return s; // fallback string (still parameterized)
}

function requireUuid(v) {
  const s = cleanId(v);
  if (!s) return { ok: false, value: null, error: "Missing orgId" };
  if (!UUID_RE.test(s))
    return { ok: false, value: null, error: "Invalid orgId (expected UUID)" };
  return { ok: true, value: s, error: null };
}

/* ------------------------------------------------------------
   SCORE HELPER
------------------------------------------------------------ */
function computeScoreFromFailures(failures = []) {
  let score = 100;

  for (const f of failures) {
    const sev = (f.severity || "").toLowerCase();
    if (sev === "critical") score -= 35;
    else if (sev === "high") score -= 25;
    else if (sev === "medium") score -= 15;
    else score -= 5;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/* ------------------------------------------------------------
   TYPE HELPERS
------------------------------------------------------------ */
function inferType(fieldKey) {
  if (!fieldKey) return "string";
  const k = fieldKey.toLowerCase();
  if (k.includes("date")) return "date";
  if (k.includes("limit") || k.includes("amount") || k.includes("gl"))
    return "number";
  return "string";
}

function resolvePolicyValue(policy, fieldKey) {
  if (!fieldKey) return undefined;

  let key = fieldKey.replace("policy.", "");

  switch (key) {
    case "coverage_type":
      return policy.coverage_type;
    case "expiration_date":
      return policy.expiration_date;
    case "effective_date":
      return policy.effective_date;
    case "carrier":
      return policy.carrier;
    case "glEachOccurrence":
      return policy.limit_each_occurrence;
    case "glAggregate":
      return policy.gl_aggregate;
    default:
      return policy[key];
  }
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

function evaluateRule(rule, policy) {
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
          .includes(String(value));
      case "before":
        return typeHint === "date" && value && expected && value < expected;
      case "after":
        return typeHint === "date" && value && expected && value > expected;
      default:
        return false;
    }
  } catch (err) {
    console.error("[evaluateRule error]", err);
    return false;
  }
}

function buildRuleLabel(rule) {
  return `${rule.field_key} ${rule.operator} ${rule.expected_value}`;
}

/* ------------------------------------------------------------
   MAIN HANDLER
------------------------------------------------------------ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // vendorId can be uuid OR integer (support both)
    const vendorId = parseId(req.body?.vendorId);

    // orgId MUST be UUID (confirmed by you)
    const orgCheck = requireUuid(req.body?.orgId);
    const orgId = orgCheck.value;

    const dryRun = !!req.body?.dryRun;

    // HARD GUARDS (prevents engine spam + uuid/int operator mismatch)
    if (!orgCheck.ok) {
      // Return 200 so missing-org auto-runs don't flood console with 400s
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: orgCheck.error,
      });
    }

    if (!vendorId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Missing vendorId",
      });
    }

    /* ------------------------------------------------------------
       1) LOAD POLICIES (UUID-safe org_id)
    ------------------------------------------------------------ */
    const policies = await sql`
      SELECT *
      FROM policies
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
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
        warning: "No policies found.",
      });
    }

    /* ------------------------------------------------------------
       2) LOAD RULES
       requirements_rules_v2 has NO org_id column
       requirements_groups_v2 DOES have org_id (UUID)
    ------------------------------------------------------------ */
    const rules = await sql`
      SELECT r.*
      FROM requirements_rules_v2 r
      JOIN requirements_groups_v2 g ON r.group_id = g.id
      WHERE g.org_id = ${orgId}
      ORDER BY r.id ASC;
    `;

    if (!rules.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        globalScore: 100,
        failedCount: 0,
        totalRules: 0,
        failingRules: [],
        passingRules: [],
        warning: "No rules found for this organization.",
      });
    }

    const failures = [];
    const passes = [];

    /* ------------------------------------------------------------
       3) EVALUATE COVERAGE RULES
    ------------------------------------------------------------ */
    for (const r of rules) {
      let matched = false;
      let matchedPolicy = null;

      for (const p of policies) {
        if (evaluateRule(r, p)) {
          matched = true;
          matchedPolicy = p;
          break;
        }
      }

      if (matched) {
        passes.push({
          ruleId: r.id,
          groupId: r.group_id,
          severity: r.severity || "medium",
          fieldKey: r.field_key,
          operator: r.operator,
          expectedValue: r.expected_value,
          message: `Rule passed: ${buildRuleLabel(r)}`,
          policyId: matchedPolicy?.id || null,
          source: "coverage_v5",
        });
      } else {
        failures.push({
          ruleId: r.id,
          groupId: r.group_id,
          severity: r.severity || "medium",
          fieldKey: r.field_key,
          operator: r.operator,
          expectedValue: r.expected_value,
          message: `Rule failed: ${buildRuleLabel(r)}`,
          source: "coverage_v5",
        });
      }
    }

    /* ------------------------------------------------------------
       4) CONTRACT RULES (orgId UUID-safe)
    ------------------------------------------------------------ */
    let contractScore = null;

    try {
      const contract = await getContractRuleResultsForVendor(vendorId, orgId);

      if (contract?.ok) {
        contractScore = contract.contractScore;

        for (const f of contract.failingContractRules || []) {
          failures.push({
            ruleId: f.rule_id,
            severity: f.severity || "high",
            fieldKey: f.field_key || "contract",
            operator: f.operator || "match",
            expectedValue: f.expected_value,
            message: f.message,
            source: "contract_v3",
          });
        }

        for (const p of contract.passingContractRules || []) {
          passes.push({
            ruleId: p.rule_id,
            severity: p.severity || "low",
            fieldKey: p.field_key || "contract",
            operator: p.operator || "match",
            expectedValue: p.expected_value,
            message: p.message,
            source: "contract_v3",
          });
        }
      }
    } catch (err) {
      console.error("[ContractRulesV5 error]", err);
    }

    /* ------------------------------------------------------------
       5) COMPUTE SCORE
    ------------------------------------------------------------ */
    let globalScore = computeScoreFromFailures(failures);
    if (contractScore != null) {
      globalScore = Math.min(globalScore, contractScore);
    }

    const totalRules = passes.length + failures.length;

    /* ------------------------------------------------------------
       6) RETURN RESULT (no DB writes for now)
    ------------------------------------------------------------ */
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      globalScore,
      totalRules,
      failedCount: failures.length,
      failingRules: failures,
      passingRules: passes,
      dryRun,
    });
  } catch (err) {
    console.error("[run-v3 ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Engine failed.",
    });
  }
}

