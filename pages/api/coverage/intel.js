// pages/api/coverage/intel.js
// ==========================================================
// PHASE 6 — COVERAGE INTEL ANALYZER
// Input: raw policy / requirement text
// Output: structured coverage summary for CoverageIntelPage
// ==========================================================

import OpenAI from "openai";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { text } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid coverage text.",
      });
    }

    const prompt = `
You are an insurance coverage extraction engine.

The user will paste carrier requirements, contract language, or policy excerpts.

Your job is to extract a clean, structured summary of coverage requirements.

Return ONLY valid JSON with this structure:

{
  "summary": {
    "coverages": [
      {
        "name": "General Liability",
        "limits": "$1,000,000 per occurrence / $2,000,000 aggregate",
        "endorsements": [
          "Additional Insured",
          "Waiver of Subrogation",
          "Primary & Noncontributory"
        ],
        "notes": "Any extra notes about GL here (optional)."
      }
    ],
    "exclusions": [
      "No coverage for professional services"
    ],
    "carrierRequirements": [
      "AM Best A- or better"
    ],
    "notes": "Overall high-level notes about this requirement set."
  }
}

Now analyze this text and fill the JSON:

"""${text}"""
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert commercial insurance coverage parser. You always return strict JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("COVERAGE INTEL JSON PARSE ERROR:", err, raw);
      return res.status(200).json({
        ok: true,
        summary: null,
        warning: "AI returned non-JSON; raw content attached.",
        raw,
      });
    }

    return res.status(200).json({
      ok: true,
      summary: parsed.summary || null,
    });
  } catch (err) {
    console.error("COVERAGE INTEL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Coverage intel failed.",
    });
  }
}
// pages/api/coverage/intel/rules.js
// ==========================================================
// PHASE 6 — RULE PLAN GENERATOR FOR V5
// Input: coverage summary
// Output: rulePlan compatible with Requirements V5 engine
// ==========================================================

import OpenAI from "openai";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { orgId, summary } = req.body || {};

    if (!summary || !summary.coverages) {
      return res.status(400).json({
        ok: false,
        error: "Missing coverage summary.",
      });
    }

    const prompt = `
You are an insurance rule architect.

You will be given a coverage summary (from another AI step).
You must design rule groups and rules that can feed a requirements engine.

Return ONLY valid JSON with this structure:

{
  "rulePlan": {
    "groups": [
      {
        "name": "General Liability",
        "description": "Core GL requirements",
        "severityDefault": "critical",
        "rules": [
          {
            "field_key": "policy.glEachOccurrence",
            "operator": "gte",
            "expected_value": 1000000,
            "severity": "critical",
            "requirement_text": "General Liability Each Occurrence limit must be at least $1,000,000."
          }
        ]
      }
    ]
  }
}

Allowed severities: "critical", "high", "medium", "low".
Use the field_keys and numeric limits when you can. If an exact numeric limit is not obvious, still create a requirement_text in plain English.

Coverage summary JSON:

${JSON.stringify(summary, null, 2)}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You design structured insurance rules suitable for a requirements engine. Always return strict JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("COVERAGE RULEPLAN JSON PARSE ERROR:", err, raw);
      return res.status(200).json({
        ok: true,
        rulePlan: null,
        warning: "AI returned non-JSON; raw content attached.",
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
      error: err.message || "Coverage rule plan generation failed.",
    });
  }
}
