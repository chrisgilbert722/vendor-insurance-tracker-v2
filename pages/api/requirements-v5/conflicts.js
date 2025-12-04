// pages/api/requirements-v5/conflicts.js
// ============================================================
// V5 AI CONFLICT DETECTION ENGINE — CINEMATIC STABLE VERSION
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
// BASELINE (LOGIC ONLY) CONFLICT DETECTION
// ============================================================
function detectConflicts(groups, rules) {
  const conflicts = [];

  // Example rule: mismatching GL Each Occurrence limits
  const glRules = rules.filter(
    (r) => r.field_key === "policy.glEachOccurrence"
  );

  if (glRules.length > 1) {
    const values = glRules.map((r) => Number(r.expected_value));
    const unique = [...new Set(values)];

    if (unique.length > 1) {
      conflicts.push({
        type: "GL_LIMIT_MISMATCH",
        message: "Different GL Each Occurrence minimums detected.",
        values: unique,
        ruleIds: glRules.map((r) => r.id),
      });
    }
  }

  // Add more baseline logic detectors here (future expansion)

  return conflicts;
}

// ============================================================
// AI EXPLANATION LAYER — FULLY FIXED, NEVER RETURNS INVALID JSON
// ============================================================
async function aiExplainConflicts(conflicts, groups, rules) {
  if (!conflicts.length) return [];

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `
You are an insurance compliance AI.

Detected Conflicts:
${JSON.stringify(conflicts, null, 2)}

Groups:
${JSON.stringify(groups, null, 2)}

Rules:
${JSON.stringify(rules, null, 2)}

Explain each conflict clearly and simply.
Respond ONLY with valid JSON:

[
  {
    "type": "GL_LIMIT_MISMATCH",
    "explanation": "...",
    "impact": "...",
    "recommendation": "..."
  }
]
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const content =
      completion?.choices?.[0]?.message?.content?.trim() || "";

    if (!content) {
      // AI returned nothing
      return [
        {
          type: "AI_EMPTY_RESPONSE",
          explanation: "AI returned no explanation.",
          impact: "Unknown until fixed.",
          recommendation: "Try running conflict scan again.",
        },
      ];
    }

    // Ensure valid JSON extraction
    let jsonText = content;

    // If wrapped in markdown ```
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json|```/g, "").trim();
    }

    try {
      return JSON.parse(jsonText);
    } catch (err) {
      return [
        {
          type: "AI_PARSE_ERROR",
          explanation: "AI returned invalid JSON.",
          impact: "The conflict still exists.",
          recommendation: jsonText.substring(0, 200),
        },
      ];
    }
  } catch (err) {
    return [
      {
        type: "AI_ERROR",
        explanation: "AI request failed.",
        impact: "Cannot determine conflict impact.",
        recommendation: err.message || "Try again.",
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
      });
    }

    // Step 1 — load data
    const { groups, rules } = await loadGroupsAndRules(orgId);

    // Step 2 — pure logic conflict detection
    const logicConflicts = detectConflicts(groups, rules);

    // Step 3 — AI-enhanced explanations
    const aiDetails = await aiExplainConflicts(
      logicConflicts,
      groups,
      rules
    );

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
