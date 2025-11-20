// pages/api/elite/expand-rule.js

import OpenAI from "openai";

export const config = {
  api: {
    // JSON body is fine, we just force Node runtime
    runtime: "nodejs",
  },
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { prompt, rule } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing prompt for AI expansion." });
    }

    // 🔍 Optional but nice: include rule JSON so AI can anchor on structure
    const ruleContext = rule
      ? `Current rule JSON:\n${JSON.stringify(rule, null, 2)}`
      : "No structured rule was provided.";

    const inputText = `
You are an expert insurance & compliance rules architect.

Write a clear, client-facing explanation and refined version of this rule.
- Use concise paragraphs and bullet points.
- Speak in plain language that a risk manager understands.
- Keep EVERYTHING in valid Markdown.
- Do NOT include code fences.

${ruleContext}

User's explanation / intent:
"${prompt}"
    `.trim();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: inputText,
      temperature: 0.3,
    });

    // Extract plain text from Responses API
    let expanded = "";
    try {
      const firstOutput = response.output?.[0];
      const firstContent = firstOutput?.content?.[0];
      expanded = firstContent?.text || "";
    } catch (e) {
      expanded = "";
    }

    if (!expanded) {
      return res.status(500).json({
        ok: false,
        error: "AI did not return any content.",
      });
    }

    return res.status(200).json({
      ok: true,
      expanded,
    });
  } catch (err) {
    console.error("AI expand-rule error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Unexpected server error in expand-rule." });
  }
}
