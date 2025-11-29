// pages/api/coverage/intel.js
// ==========================================================
// PHASE 6 — COVERAGE INTEL ANALYZER
// Input: raw policy text
// Output: structured coverage summary
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

    const { text } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid coverage text.",
      });
    }

    const prompt = `
Extract commercial insurance coverages, limits, endorsements, exclusions, and carrier requirements.
Return STRICT JSON with this structure:

{
  "summary": {
    "coverages": [ ... ],
    "exclusions": [...],
    "carrierRequirements": [...],
    "notes": ""
  }
}

Now analyze:

"""${text}"""
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert insurance coverage parser. Return ONLY valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("JSON parse error:", raw);
      return res.status(200).json({
        ok: true,
        summary: null,
        warning: "AI returned non-JSON",
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
      error: err.message || "Coverage analysis failed.",
    });
  }
}
