// pages/api/requirements-v5/conflicts.js
// ============================================================
// V5 AI CONFLICT DETECTION ENGINE (CINEMATIC MODE)
// ============================================================

import { Client } from "pg";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: true,
    runtime: "nodejs"
  }
};

// DB HELPER
async function loadGroupsAndRules(orgId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  try {
    const groupsRes = await client.query(
      `SELECT id, name FROM requirements_groups_v2 WHERE org_id = $1 ORDER BY id ASC`,
      [orgId]
    );

    const rulesRes = await client.query(
      `SELECT * FROM requirements_rules_v2 WHERE group_id IN 
        (SELECT id FROM requirements_groups_v2 WHERE org_id = $1)
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

// BASELINE LOGIC CONFLICTS
function detectConflicts(groups, rules) {
  const conflicts = [];

  // Example: conflicting GL limits
  const glRules = rules.filter(r => r.field_key === "policy.glEachOccurrence");

  if (glRules.length > 1) {
    const mismatches = glRules.map(r => Number(r.expected_value));
    const unique = [...new Set(mismatches)];

    if (unique.length > 1) {
      conflicts.push({
        type: "GL_LIMIT_MISMATCH",
        message: "Groups specify different GL Each Occurrence minimums.",
        values: unique,
        ruleIds: glRules.map(r => r.id)
      });
    }
  }

  // Expand here with more static checks later

  return conflicts;
}
// ============================================================
// AI EXPLANATION LAYER
// ============================================================

async function aiExplainConflicts(conflicts, groups, rules) {
  if (!conflicts.length) return [];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
You are an insurance compliance AI.

Given these detected conflicts:
${JSON.stringify(conflicts, null, 2)}

Groups:
${JSON.stringify(groups, null, 2)}

Rules:
${JSON.stringify(rules, null, 2)}

Explain each conflict simply and clearly.
Return JSON with:
[
  {
    "type": "...",
    "explanation": "...",
    "impact": "...",
    "recommendation": "..."
  }
]
`;

  try {
    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt
    });

    const raw = completion.output[0].content[0].text;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    return [
      {
        type: "AI_ERROR",
        explanation: "AI could not analyze conflicts.",
        impact: "Unknown until fixed.",
        recommendation: err.message || "Try again."
      }
    ];
  }
}
// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req, res) {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId"
      });
    }

    // Step 1 — Load rules + groups
    const { groups, rules } = await loadGroupsAndRules(orgId);

    // Step 2 — Logic-based detection
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
      aiDetails
    });

  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: err.message || "Unknown server error",
      logicConflicts: [],
      aiDetails: []
    });
  }
}
