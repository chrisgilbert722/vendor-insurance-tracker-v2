// pages/api/rules/explain.js
// ==========================================================
// AI Rule Explanation (Phase 5)
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

    const { rule, groupName, samplePolicyText } = req.body;

    if (!rule) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing rule object" });
    }

    // -------------
    // AI PROMPT
    // -------------
    const prompt = `
Explain the insurance requirement rule below in plain, simple English.

Rule:
${JSON.stringify(rule, null, 2)}

Group Name: ${groupName || "(none)"}

Sample Policy (for context only):
${samplePolicyText || "(none)"}

Explain:
- What this rule checks
- Why it matters
- What it means in real insurance terms
- Use friendly, human language (not legal speak)
`;

    // -------------
    // JSON MODE RESPONSE
    // -------------
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an insurance compliance explainer bot. Always output valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const msg = completion.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(msg);
    } catch (e) {
      return res.status(200).json({
        ok: true,
        explanation:
          "AI responded but did not return valid JSON.\n\n" + msg,
      });
    }

    return res.status(200).json({
      ok: true,
      explanation: parsed.explanation || parsed.text || msg,
    });
  } catch (err) {
    console.error("EXPLAIN RULE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI explanation failed",
    });
  }
}
