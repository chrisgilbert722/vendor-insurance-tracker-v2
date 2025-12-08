// pages/api/requirements-v5/conflicts.js
// ============================================================
// V5 AI CONFLICT DETECTION ENGINE — FIXED, EXPORTABLE, SAFE
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
// DB HELPER — Load Groups + Rules (V2 powering V5)
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

    return { groups: groupsRes.rows, rules: rulesRes.rows };
  } finally {
    await client.end();
  }
}

// ============================================================
// PURE LOGIC CONFLICT DETECTION — V5
// ============================================================
function detectConflicts(groups, rules) {
  const conflicts = [];

  // Helper
  const toNumberSafe = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  const ruleKey = (r) => `${r.group_id || "g"}::${r.field_key || ""}`;

  // ---------------------------------------
  // 0) GL LIMIT MISMATCH
  // ---------------------------------------
  {
    const glRules = rules.filter(
      (r) => r.field_key === "policy.glEachOccurrence"
    );

    if (glRules.length > 1) {
      const values = glRules.map((r) => Number(r.expected_value));
      const unique = [...new Set(values)].filter((v) => !Number.isNaN(v));

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
      if (list.length > 1) {
        conflicts.push({
          type: "DUPLICATE_RULES",
          message: `Detected ${list.length} identical rules.`,
          rules: list.map((r) => r.id),
        });
      }
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

      const valueKey = String(r.expected_value || "").trim().toLowerCase();
      const key = `${ruleKey(r)}::${valueKey}`;

      if (!byFieldValue.has(key))
        byFieldValue.set(key, { equals: [], notEquals: [] });

      if (r.operator === "equals")
        byFieldValue.get(key).equals.push(r);
      else byFieldValue.get(key).notEquals.push(r);
    }

    for (const [key, bucket] of byFieldValue.entries()) {
      if (bucket.equals.length && bucket.notEquals.length) {
        conflicts.push({
          type: "EQUALS_VS_NOT_EQUALS",
          message: "Same value required and forbidden by different rules.",
          rules: [...bucket.equals, ...bucket.notEquals].map((r) => r.id),
        });
      }
    }
  }

  // ---------------------------------------
  // 3) IMPOSSIBLE RANGE (gte / lte)
  // ---------------------------------------
  {
    const byField = new Map();

    for (const r of rules) {
      if (!r.field_key) continue;
      if (!["gte", "lte"].includes(r.operator)) continue;

      const key = ruleKey(r);
      if (!byField.has(key)) byField.set(key, { gte: [], lte: [] });

      const n = toNumberSafe(r.expected_value);
      if (n === null) continue;

      if (r.operator === "gte") byField.get(key).gte.push({ ...r, n });
      else byField.get(key).lte.push({ ...r, n });
    }

    for (const [key, bucket] of byField.entries()) {
      for (const rGte of bucket.gte) {
        for (const rLte of bucket.lte) {
          if (rGte.n > rLte.n) {
            conflicts.push({
              type: "IMPOSSIBLE_RANGE",
              message: "gte > lte on same field.",
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

      const valueKey = String(r.expected_value || "").trim().toLowerCase();
      if (!byFieldEquals.get(key).has(valueKey))
        byFieldEquals.get(key).set(valueKey, []);

      byFieldEquals.get(key).get(valueKey).push(r);
    }

    for (const [fieldKey, valueMap] of byFieldEquals.entries()) {
      if (valueMap.size > 1) {
        const values = Array.from(valueMap.keys());
        const allRules = [];
        for (const arr of valueMap.values()) allRules.push(...arr);

        conflicts.push({
          type: "MULTIPLE_EQUALS_VALUES",
          message: `Conflicting equals-values: ${values.join(", ")}`,
          rules: allRules.map((r) => r.id),
        });
      }
    }
  }

  // ---------------------------------------
  // 5) Coverage Type allow/deny
  // ---------------------------------------
  {
    const coverageRules = rules.filter(
      (r) => r.field_key === "policy.coverage_type"
    );

    if (coverageRules.length) {
      const equalsMap = new Map();
      const notEqualsMap = new Map();

      for (const r of coverageRules) {
        const key = String(r.expected_value || "").trim().toLowerCase();
        if (r.operator === "equals") {
          if (!equalsMap.has(key)) equalsMap.set(key, []);
          equalsMap.get(key).push(r);
        } else if (r.operator === "not_equals") {
          if (!notEqualsMap.has(key)) notEqualsMap.set(key, []);
          notEqualsMap.get(key).push(r);
        }
      }

      for (const [key, eqRules] of equalsMap.entries()) {
        if (notEqualsMap.get(key)?.length) {
          conflicts.push({
            type: "COVERAGE_TYPE_ALLOW_DENY",
            message: `Coverage type REQUIRED and EXCLUDED: "${key}"`,
            rules: [...eqRules, ...notEqualsMap.get(key)].map((r) => r.id),
          });
        }
      }
    }
  }

  // ---------------------------------------
  // 6) Missing expected_value  ← FIXED SYNTAX
  // ---------------------------------------
  {
    const missing = rules.filter(
      (r) => r.expected_value === null || r.expected_value === undefined
    );
    if (missing.length) {
      conflicts.push({
        type: "MISSING_EXPECTED_VALUE",
        message: "Some rules are missing expected_value.",
        rules: missing.map((r) => r.id),
      });
    }
  }

  return conflicts;
}

// ⭐ Export detectConflicts for other modules (Fix Cockpit uses it)
export { detectConflicts };

// ============================================================
// MINIMAL DEFAULT HANDLER (NOT USED BY Fix Cockpit)
// ============================================================
export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    message:
      "Use /api/requirements/check for Fix Cockpit. This endpoint only reports V5 conflicts when called directly.",
  });
}

