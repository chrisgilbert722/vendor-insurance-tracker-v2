// pages/api/requirements-v5/conflicts.js
// ============================================================
// V5 AI CONFLICT DETECTION ENGINE — CINEMATIC STABLE VERSION
// Upgraded for full V5 conflict intelligence + UI compatibility
// ============================================================

import { Client } from "pg";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: true,
    runtime: "nodejs",
  },
};

// ============================================================
// DB HELPER — Load Groups + Rules (V2 tables powering V5)
// ============================================================
async function loadGroupsAndRules(orgId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

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
      rules: rulesRes.rows,
    };
  } finally {
    await client.end();
  }
}

// ============================================================
// BASELINE (LOGIC ONLY) CONFLICT DETECTION — V5
// Returns array of:
// { type, message, rules: [ruleId...], meta?: {...} }
// ============================================================
function detectConflicts(groups, rules) {
  const conflicts = [];

  // Helper: safe number parse
  function toNumberSafe(v) {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  function ruleKey(r) {
    return `${r.group_id || "g"}::${r.field_key || ""}`;
  }

  // ---------------------------------------
  // 0) ORIGINAL GL LIMIT MISMATCH
  // ---------------------------------------
  {
    const glRules = rules.filter(
      (r) => r.field_key === "policy.glEachOccurrence"
    );

    if (glRules.length > 1) {
      const values = glRules.map((r) => Number(r.expected_value));
      const unique = [...new Set(values)].filter(
        (v) => !Number.isNaN(v)
      );

      if (unique.length > 1) {
        conflicts.push({
          type: "GL_LIMIT_MISMATCH",
          message: "Different GL Each Occurrence minimums detected.",
          values: unique,
          rules: glRules.map((r) => r.id),
        });
      }
    }
  }

  // ---------------------------------------
  // 1) DUPLICATE RULES
  // ---------------------------------------
  {
    const map = new Map();

    for (const r of rules) {
      const key = `${ruleKey(r)}::${r.operator || ""}::${String(
        r.expected_value || ""
      ).trim().toLowerCase()}::${r.severity || ""}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }

    for (const [key, list] of map.entries()) {
      if (list.length <= 1) continue;

      conflicts.push({
        type: "DUPLICATE_RULES",
        message: `Detected ${list.length} rules that appear to enforce the exact same condition.`,
        rules: list.map((r) => r.id),
      });
    }
  }

  // ---------------------------------------
  // 2) EQUALS vs NOT_EQUALS conflicts
  // ---------------------------------------
  {
    const byFieldValue = new Map();

    for (const r of rules) {
      if (!r.field_key) continue;
      if (!["equals", "not_equals"].includes(r.operator)) continue;

      const valueKey = String(r.expected_value || "")
        .trim()
        .toLowerCase();
      const key = `${ruleKey(r)}::${valueKey}`;

      if (!byFieldValue.has(key)) {
        byFieldValue.set(key, { equals: [], notEquals: [] });
      }

      const bucket = byFieldValue.get(key);
      if (r.operator === "equals") bucket.equals.push(r);
      else bucket.notEquals.push(r);
    }

    for (const [key, bucket] of byFieldValue.entries()) {
      if (bucket.equals.length && bucket.notEquals.length) {
        const allRules = [...bucket.equals, ...bucket.notEquals];
        const valueLabel =
          allRules[0]?.expected_value !== undefined
            ? String(allRules[0].expected_value)
            : "(value)";

        conflicts.push({
          type: "EQUALS_VS_NOT_EQUALS",
          message: `Field has rules that both REQUIRE and FORBID the same value (${valueLabel}).`,
          rules: allRules.map((r) => r.id),
        });
      }
    }
  }

  // ---------------------------------------
  // 3) RANGE CONTRADICTIONS (gte / lte)
  // ---------------------------------------
  {
    const byField = new Map();

    for (const r of rules) {
      if (!r.field_key) continue;
      if (!["gte", "lte"].includes(r.operator)) continue;

      const key = ruleKey(r);
      if (!byField.has(key)) {
        byField.set(key, { gte: [], lte: [] });
      }

      const bucket = byField.get(key);
      const n = toNumberSafe(r.expected_value);
      if (n === null) continue;

      if (r.operator === "gte") bucket.gte.push({ ...r, n });
      else bucket.lte.push({ ...r, n });
    }

    for (const [key, bucket] of byField.entries()) {
      for (const rGte of bucket.gte) {
        for (const rLte of bucket.lte) {
          if (rGte.n > rLte.n) {
            conflicts.push({
              type: "IMPOSSIBLE_RANGE",
              message: `Impossible range on field "${rGte.field_key}": one rule requires ≥ ${rGte.expected_value}, another requires ≤ ${rLte.expected_value}.`,
              rules: [rGte.id, rLte.id],
            });
          }
        }
      }
    }
  }

  // ---------------------------------------
  // 4) MULTIPLE equals-values
  // ---------------------------------------
  {
    const byFieldEquals = new Map();

    for (const r of rules) {
      if (!r.field_key || r.operator !== "equals") continue;
      const key = ruleKey(r);
      if (!byFieldEquals.has(key)) byFieldEquals.set(key, new Map());
      const valueKey = String(r.expected_value || "")
        .trim()
        .toLowerCase();
      const map = byFieldEquals.get(key);
      if (!map.has(valueKey)) map.set(valueKey, []);
      map.get(valueKey).push(r);
    }

    for (const [fieldKey, valueMap] of byFieldEquals.entries()) {
      if (valueMap.size <= 1) continue;

      const values = Array.from(valueMap.keys());
      const involvedRules = [];
      for (const list of valueMap.values()) {
        involvedRules.push(...list);
      }

      conflicts.push({
        type: "MULTIPLE_EQUALS_VALUES",
        message: `Field has multiple 'equals' rules with different values (${values.join(", ")}).`,
        rules: involvedRules.map((r) => r.id),
      });
    }
  }

  // ---------------------------------------
  // 5) Coverage Type overlaps
  // ---------------------------------------
  {
    const coverageRules = rules.filter(
      (r) => r.field_key === "policy.coverage_type"
    );

    if (coverageRules.length > 0) {
      const equalsMap = new Map();
      const notEqualsMap = new Map();

      for (const r of coverageRules) {
        const valueKey = String(r.expected_value || "")
          .trim()
          .toLowerCase();
        if (r.operator === "equals") {
          if (!equalsMap.has(valueKey)) equalsMap.set(valueKey, []);
          equalsMap.get(valueKey).push(r);
        } else if (r.operator === "not_equals") {
          if (!notEqualsMap.has(valueKey)) notEqualsMap.set(valueKey, []);
          notEqualsMap.get(valueKey).push(r);
        }
      }

      for (const [val, eqRules] of equalsMap.entries()) {
        const neqRules = notEqualsMap.get(val) || [];
        if (neqRules.length) {
          conflicts.push({
            type: "COVERAGE_TYPE_ALLOW_DENY",
            message: `Coverage type has rules that both REQUIRE and EXCLUDE "${val}".`,
            rules: [...eqRules, ...neqRules].map((r) => r.id),
          });
        }
      }
    }
  }

  // ---------------------------------------
  // 6) Rules with missing expected_value
  // ---------------------------------------
  {
    const missing = rules.filter(
      (r) => r.expected_value === null || r.expected_value === undefined
