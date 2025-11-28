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

Return ONLY JSON.

User text:
"""${text}"""
`;

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      response_format: { type: "json_object" },
    });

    // ------------------------------
    // THE CORRECT READ METHOD FOR GPT-4.1
    // ------------------------------
    const rawJson = completion.output?.[0]?.content?.[0]?.text;

    if (!rawJson) {
      console.error("NO JSON RETURNED:", completion);
      throw new Error("AI did not return JSON output.");
    }

    const parsed = JSON.parse(rawJson);

    return res.status(200).json({ ok: true, ...parsed });
  } catch (err) {
    console.error("AI PARSE ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Failed to parse rules with AI." });
  }
}
