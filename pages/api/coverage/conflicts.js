// pages/api/coverage/conflicts.js
// ==========================================================
// PHASE 8 — AI CONFLICT DETECTION
// Compare existing V5 rules vs incoming AI rulePlan
// ==========================================================

import { Client } from "pg";
import OpenAI from "openai";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Only POST supported for conflicts API." });
  }

  const { orgId, rulePlan } = req.body || {};

  if (!orgId) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing orgId for conflict scan." });
  }

  if (!rulePlan || !Array.isArray(rulePlan.groups)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid rulePlan; expected { groups: [...] }.",
    });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Pull existing rules for this org
    const existingRes = await client.query(
      `
      SELECT
        r.id,
        r.group_id,
        r.field_key,
        r.operator,
        r.expected_value,
        r.severity,
        r.requirement_text,
        g.name AS group_name
      FROM requirements_rules_v2 r
      JOIN requirements_groups_v2 g
        ON r.group_id = g.id
      WHERE g.org_id = $1
      ORDER BY g.name, r.id;
      `,
      [orgId]
    );

    const existingRules = existingRes.rows || [];

    const payload = {
      existingRules: existingRules.map((r) => ({
        id: r.id,
        groupName: r.group_name,
        field_key: r.field_key,
        operator: r.operator,
        expected_value: r.expected_value,
        severity: r.severity,
        requirement_text: r.requirement_text,
      })),
      incomingRulePlan: rulePlan,
    };

    const prompt = `
You are an insurance compliance rule conflict engine.

You receive:
1) Existing rules in production
2) A new incoming rulePlan from AI

Identify:
- Coverage limit conflicts (e.g., existing GL 1M, new GL 500k)
- Duplicate rules
- Overly weak or overly strict new rules vs existing
- Obvious contradictions (one requires endorsement, another says endorsement not required)
- Anything a human should fix before going live.

Return ONLY valid JSON:

{
  "conflicts": [
    {
      "type": "limit_conflict" | "duplicate" | "endorsement_conflict" | "severity_mismatch" | "other",
      "existingRule": {
        "id": 123,
        "groupName": "General Liability",
        "field_key": "policy.glEachOccurrence",
        "operator": "gte",
        "expected_value": 1000000,
        "severity": "critical",
        "requirement_text": "GL Each Occurrence ≥ $1,000,000"
      },
      "newRule": {
        "groupName": "General Liability (AI Plan)",
        "field_key": "policy.glEachOccurrence",
        "operator": "gte",
        "expected_value": 500000,
        "severity": "medium",
        "requirement_text": "GL Each Occurrence ≥ $500,000"
      },
      "summary": "New rule proposes a weaker GL limit than the existing rule.",
      "suggestedResolution": "Keep existing 1M limit; discard or adjust the new weaker rule."
    }
  ]
}

Existing rules and incoming rulePlan:

${JSON.stringify(payload, null, 2)}
`;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert in commercial insurance rule conflicts. Always return valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("CONFLICT JSON PARSE ERROR:", err, raw);
      return res.status(200).json({
        ok: true,
        conflicts: [],
        warning: "AI returned non-JSON; raw content attached.",
        raw,
      });
    }

    return res.status(200).json({
      ok: true,
      conflicts: parsed.conflicts || [],
    });
  } catch (err) {
    console.error("CONFLICT API ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Conflict detection failed.",
    });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
