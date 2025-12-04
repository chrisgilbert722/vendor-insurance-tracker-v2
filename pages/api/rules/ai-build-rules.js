// pages/api/rules/ai-build-rules.js
// AI Rule Builder V6 — Natural Language -> rule_groups + rules_v3

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, prompt } = req.body || {};

    if (!orgId || !prompt || !prompt.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or prompt.",
      });
    }

    // ------------------------------------------------------------------
    // 1) Ask AI to generate strict JSON ruleGroups/rules
    // ------------------------------------------------------------------
    const system = {
      role: "system",
      content: `
You are an insurance compliance rules engineer for a vendor COI platform.

Given a natural-language description of insurance requirements, you must output ONLY JSON with this structure:

{
  "ruleGroups": [
    {
      "label": "string",
      "description": "string",
      "severity": "low|medium|high|critical",
      "rules": [
        {
          "type": "coverage|limit|endorsement|date",
          "field": "string",         
          "condition": "exists|missing|gte|lte|requires|before|after",
          "value": "string or number",
          "severity": "low|medium|high|critical",
          "message": "human readable rule message"
        }
      ]
    }
  ]
}

- "field" should match COI data fields like: gl_limit, auto_limit, umbrella_limit, wc_required, endorsements, expiration_date, etc.
- "message" must be something the admin would see when the rule fails (e.g., "GL Each Occurrence limit too low.")
- Use multiple rule groups if appropriate (GL, Auto, WC, Umbrella, Endorsements).
- Output STRICT JSON only.
`,
    };

    const user = {
      role: "user",
      content: `Org ID: ${orgId}\n\nRequirements:\n${prompt}`,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [system, user],
    });

    const raw = completion.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[AI RULE BUILDER] JSON parse error:", err, raw.slice(0, 400));
      return res.status(200).json({
        ok: false,
        error: "AI returned invalid JSON. Try refining your prompt.",
        raw,
      });
    }

    const ruleGroups = Array.isArray(parsed.ruleGroups) ? parsed.ruleGroups : [];

    if (!ruleGroups.length) {
      return res.status(200).json({
        ok: false,
        error: "AI returned no rule groups.",
        raw,
      });
    }

    // ------------------------------------------------------------------
    // 2) Save rule_groups + rules_v3 to Neon (AUTO-SAVE MODE)
    // ------------------------------------------------------------------
    const savedGroups = [];

    for (const g of ruleGroups) {
      const groupLabel = g.label || "AI Rule Group";
      const groupDesc = g.description || "";
      const groupSeverity = g.severity || "medium";

      const insertedGroup = await sql`
        INSERT INTO rule_groups (org_id, label, description, severity, active)
        VALUES (${orgId}, ${groupLabel}, ${groupDesc}, ${groupSeverity}, TRUE)
        RETURNING id, label, description, severity;
      `;

      const groupId = insertedGroup[0].id;

      const rules = Array.isArray(g.rules) ? g.rules : [];
      const savedRules = [];

      for (const r of rules) {
        const type = r.type || "coverage";
        const field = r.field || "unknown_field";
        const condition = r.condition || "exists";
        const value = r.value ?? "";
        const severity = r.severity || "medium";
        const message = r.message || "Requirement not met.";

        const insertedRule = await sql`
          INSERT INTO rules_v3 (group_id, type, field, condition, value, message, severity, active)
          VALUES (${groupId}, ${type}, ${field}, ${condition}, ${String(
          value
        )}, ${message}, ${severity}, TRUE)
          RETURNING id, type, field, condition, value, message, severity;
        `;

        savedRules.push(insertedRule[0]);
      }

      savedGroups.push({
        group: insertedGroup[0],
        rules: savedRules,
      });
    }

    return res.status(200).json({
      ok: true,
      savedGroups,
      raw,
    });
  } catch (err) {
    console.error("[AI RULE BUILDER] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI Rule Builder failed.",
    });
  }
}
