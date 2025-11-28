// pages/api/requirements-v3/ai-parse.js
import OpenAI from "openai";

export const config = {
  api: { bodyParser: true },
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { text } = req.body || {};

  if (!text || typeof text !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "Missing or invalid text." });
  }

  try {
    const prompt = `
You are an insurance compliance assistant. 
The user will give free-text insurance requirements. 
Return ONLY valid JSON describing groups and rules.

FORMAT:
{
  "groups": [
    {
      "name": "General Liability",
      "rules": [
        {
          "field_key": "policy.glEachOccurrence",
          "operator": "gte",
          "expected_value": 1000000,
          "severity": "critical",
          "requirement_text": "General Liability limit must be ≥ $1M per occurrence"
        }
      ]
    }
  ]
}

Allowed field_keys:
- policy.coverage_type
- policy.glEachOccurrence
- policy.glAggregate
- policy.expiration_date
- policy.carrier

Allowed operators:
equals, not_equals, contains, gte, lte

Allowed severities:
critical, high, medium, low

DO NOT RETURN ANYTHING EXCEPT JSON.

User requirement text:
"""${text}"""
`;

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      response_format: { type: "json_object" }
    });

    // The correct way to read output for Responses API
    const raw = completion.output_text; 

    const parsed = JSON.parse(raw);

    return res.status(200).json({ ok: true, ...parsed });
  } catch (err) {
    console.error("AI PARSE ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to parse rules with AI." });
  }
}
