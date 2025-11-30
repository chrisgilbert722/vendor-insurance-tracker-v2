// pages/api/renewals/escalate-ai.js

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { vendor, coverage, stage, days_left, type } = req.body;

    const prompt = `
You are an assistant that writes short internal summaries.

Vendor: ${vendor}
Coverage: ${coverage}
Stage: ${stage}
Days left: ${days_left}
Escalation type: ${type}

Explain:
1) Why this is important.
2) What specifically should be done.
3) Keep it under 6 sentences.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
    });

    const ai = completion.choices[0].message.content || "";

    return res.status(200).json({ ok: true, ai });
  } catch (err) {
    console.error("[escalate-ai] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
