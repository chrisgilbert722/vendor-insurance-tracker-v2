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
  // 0) ORIGINAL GL LIMIT MISMATCH (your existing logic)
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
  // Same group, field, operator, expected_value, severity
  // ---------------------------------------
  {
    const map = new Map(); // key -> [rules]

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
  // Same group+field+value, opposing operator
  // ---------------------------------------
  {
    const byFieldValue = new Map(); // group+field+value -> { equals:[], notEquals:[] }

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
  // Example: gte 2M and lte 1M on the same field
  // ---------------------------------------
  {
    const byField = new Map(); // group+field -> { gte:[], lte:[] }

    for (const r of rules) {
      if (!r.field_key) continue;
      if (!["gte", "lte"].includes(r.operator)) continue;

      const key = ruleKey(r);
      if (!byField.has(key)) {
        byField.set(key, { gte: [], lte: [] });
      }

      const bucket = byField.get(key);
      const n = toNumberSafe(r.expected_value);
      if (n === null) continue; // not numeric, skip range logic

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
  // 4) EQUALS with multiple different values on same field
  // Same group + field, equals operator, different values
  // ---------------------------------------
  {
    const byFieldEquals = new Map(); // group+field -> {value -> [rules]}

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

      // There are multiple distinct equals-values
      const values = Array.from(valueMap.keys());
      const involvedRules = [];
      for (const list of valueMap.values()) {
        involvedRules.push(...list);
      }

      conflicts.push({
        type: "MULTIPLE_EQUALS_VALUES",
        message: `Field has multiple 'equals' rules with different values (${values.join(
          ", "
        )}).`,
        rules: involvedRules.map((r) => r.id),
      });
    }
  }

  // ---------------------------------------
  // 5) Coverage Type overlaps / contradictions
  // equals vs not_equals on policy.coverage_type
  // ---------------------------------------
  {
    const coverageRules = rules.filter(
      (r) => r.field_key === "policy.coverage_type"
    );

    if (coverageRules.length > 0) {
      const equalsMap = new Map(); // value -> [rule]
      const notEqualsMap = new Map(); // value -> [rule]

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
    );
    if (missing.length) {
      conflicts.push({
        type: "MISSING_EXPECTED_VALUE",
        message: "Some rules are missing an expected_value.",
        rules: missing.map((r) => r.id),
      });
    }
  }

  return conflicts;
}

// ============================================================
// AI EXPLANATION LAYER — V5
// Takes baseline conflicts + groups + rules
// Returns array of objects describing each conflict.
// ============================================================
async function aiExplainConflicts(conflicts, groups, rules) {
  if (!conflicts.length) return [];

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
You are an insurance compliance AI.

We detected the following LOGICAL conflicts in our rule engine:

CONFLICTS:
${JSON.stringify(conflicts, null, 2)}

GROUPS:
${JSON.stringify(groups, null, 2)}

RULES:
${JSON.stringify(rules, null, 2)}

For EACH item in CONFLICTS, return an explanation in the SAME ORDER.

Respond ONLY with valid JSON, in this exact format:

[
  {
    "type": "GL_LIMIT_MISMATCH",
    "summary": "Short human summary of the conflict.",
    "impact": "What this could cause in the real world.",
    "suggestion": "Clear recommendation on how to fix or clean up these rules."
  }
]

RULES:
- The array MUST be the same length as the 'conflicts' array.
- 'type' MUST match the incoming conflict type.
- Do NOT include any text outside the JSON.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    let content = completion?.choices?.[0]?.message?.content?.trim() || "";

    if (!content) {
      // AI returned nothing
      return [
        {
          type: "AI_EMPTY_RESPONSE",
          summary: "AI returned no explanation for conflicts.",
          impact: "The conflicts still exist but lack human explanation.",
          suggestion: "Try running the conflict scan again or review rules manually.",
        },
      ];
    }

    // Strip markdown fences if present
    if (content.startsWith("```")) {
      content = content.replace(/```json|```/g, "").trim();
    }

    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error("AI response was not an array.");
      }
      return parsed;
    } catch (err) {
      return [
        {
          type: "AI_PARSE_ERROR",
          summary: "AI returned invalid JSON.",
          impact: "Human-readable explanations are unavailable.",
          suggestion: content.substring(0, 200),
        },
      ];
    }
  } catch (err) {
    return [
      {
        type: "AI_ERROR",
        summary: "AI request failed.",
        impact: "Cannot determine conflict impact from AI.",
        suggestion: err.message || "Try again later.",
      },
    ];
  }
}

// ============================================================
// MAIN API HANDLER (NEVER RETURNS INVALID JSON)
// ============================================================
export default async function handler(req, res) {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId.",
        logicConflicts: [],
        aiDetails: [],
      });
    }

    // Step 1 — load data
    const { groups, rules } = await loadGroupsAndRules(orgId);

    // Step 2 — pure logic conflict detection (V5)
    const logicConflicts = detectConflicts(groups, rules);

    // Step 3 — AI-enhanced explanations (aligned by index)
    const aiRaw = await aiExplainConflicts(logicConflicts, groups, rules);

    // Step 4 — Shape response for UI: aiDetails[]
    const aiDetails = logicConflicts.map((conflict, idx) => {
      const ai = aiRaw[idx] || {};
      return {
        type: ai.type || conflict.type,
        summary: ai.summary || ai.explanation || conflict.message,
        impact: ai.impact || "",
        suggestion:
          ai.suggestion ||
          ai.recommendation ||
          "Review these rules and adjust thresholds or remove duplicates.",
        // V5 UI expects 'rules' for highlighting; keep ruleIds alias if needed anywhere else
        rules: conflict.rules || conflict.ruleIds || [],
        ruleIds: conflict.rules || conflict.ruleIds || [],
      };
    });

    return res.status(200).json({
      ok: true,
      orgId,
      logicConflicts,
      aiDetails,
    });
  } catch (err) {
    // ALWAYS return JSON so UI never breaks
    return res.status(200).json({
      ok: false,
      error: err.message || "Unknown server error.",
      logicConflicts: [],
      aiDetails: [],
    });
  }
}
