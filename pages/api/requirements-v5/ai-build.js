// pages/api/requirements-v5/ai-build.js
// ==========================================================
// AI RULE BUILDER — REQUIREMENTS ENGINE V5
// Converts natural language → structured rules → saves to DB
// ==========================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, groupId, text } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId." });
    }
    if (!groupId) {
      return res.status(400).json({ ok: false, error: "Missing groupId." });
    }
    if (!text?.trim()) {
      return res.status(400).json({ ok: false, error: "Missing input text." });
    }

    // -------------------------------
    // AI PROMPT — converts text → rules
    // -------------------------------
    const prompt = `
You are an insurance compliance rule builder.

Convert this text into a JSON array of RULE OBJECTS.

INPUT:
${text}

RULE OBJECT FORMAT:
{
  "field_key": "policy.glEachOccurrence",
  "operator": "gte",
  "expected_value": 1000000,
  "severity": "critical",
  "requirement_text": "GL Each Occurrence must be at least 1M"
}

ALLOWED FIELDS:
- policy.coverage_type
- policy.glEachOccurrence
- policy.glAggregate
- policy.expiration_date
- policy.carrier

ALLOWED OPERATORS:
- equals
- not_equals
- gte
- lte
- contains
- in_list
- before
- after

ALLOWED SEVERITIES:
- critical
- required
- recommended

REQUIREMENTS:
- Only output JSON array
- No explanation
- Severity must be inferred logically (big $ amounts = critical)
- Try to return 3 to 20 rules depending on complexity
`;

    // -------------------------------
    // CALL OPENAI
    // -------------------------------
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "You convert text → insurance rules." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });

    let content = aiResponse.choices?.[0]?.message?.content || "[]";

    // Try to parse JSON safely
    let rules;
    try {
      rules = JSON.parse(content);
      if (!Array.isArray(rules)) throw new Error("AI returned non-array JSON.");
    } catch (err) {
      console.error("AI JSON parse error:", err);
      return res.status(500).json({
        ok: false,
        error: "AI returned invalid JSON.",
        raw: content,
      });
    }

    // -------------------------------
    // INSERT RULES INTO DATABASE
    // -------------------------------
    const insertedRules = [];

    for (const r of rules) {
      try {
        const inserted = await sql`
          INSERT INTO requirement_rules (
            org_id,
            group_id,
            field_key,
            operator,
            expected_value,
            severity,
            requirement_text
          )
          VALUES (
            ${orgId},
            ${groupId},
            ${r.field_key},
            ${r.operator},
            ${String(r.expected_value)},
            ${r.severity},
            ${r.requirement_text || ""}
          )
          RETURNING *
        `;

        insertedRules.push(inserted[0]);
      } catch (dbErr) {
        console.error("Rule insert failed:", dbErr);
      }
    }

    // -------------------------------
    // RESPONSE
    // -------------------------------
    return res.status(200).json({
      ok: true,
      message: `AI generated ${insertedRules.length} rules.`,
      rules: insertedRules,
    });
  } catch (error) {
    console.error("AI Builder Error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "AI builder failed.",
    });
  }
}
