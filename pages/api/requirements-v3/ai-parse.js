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
Return ONLY valid JSON describing "groups" and "rules".

Example format:
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
          "requirement_text": "GL ≥ $1M per occurrence"
        }
      ]
    }
  ]
}

User text:
"""${text}"""

Return ONLY JSON — no commentary.
`;

    // 🔥 Use the classic Chat Completions API (your SDK supports this)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",  // BEST JSON OUTPUT for older SDKs
      messages: [
        { role: "system", content: "You output ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    // Classic chat completions structure
    const raw = completion.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error("AI returned no JSON content.");
    }

    const parsed = JSON.parse(raw);

    return res.status(200).json({ ok: true, ...parsed });
  } catch (err) {
    console.error("AI PARSE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to parse rules with AI.",
    });
  }
}
