// pages/api/coverage/intel/rules.js
// ==========================================================
// PHASE 6 — RULE PLAN GENERATOR FOR V5
// Input: structured coverage summary
// Output: rulePlan for Requirements V5
// ==========================================================

import OpenAI from "openai";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { summary } = req.body || {};

    if (!summary || !summary.coverages) {
      return res.status(400).json({
        ok: false,
        error: "Missing coverage summary.",
      });
    }

    const prompt = `
You are an insurance rule architect.

Convert this coverage summary into rule groups & rules structured for V5.

Return STRICT JSON:

{
  "rulePlan": {
    "groups": [
      {
        "name": "",
        "description": "",
        "severityDefault": "critical",
        "rules": [
          {
            "field_key": "",
            "operator": "",
            "expected_value": "",
            "severity": "",
            "requirement_text": ""
          }
        ]
      }
    ]
  }
}

Summary:
${JSON.stringify(summary, null, 2)}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate structured insurance rules. Return ONLY JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("RULEPLAN JSON ERROR:", raw);
      return res.status(200).json({
        ok: true,
        rulePlan: null,
        warning: "AI returned non-JSON",
        raw,
      });
    }

    return res.status(200).json({
      ok: true,
      rulePlan: parsed.rulePlan || null,
    });
  } catch (err) {
    console.error("COVERAGE RULEPLAN ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Rule plan build failed.",
    });
  }
}
