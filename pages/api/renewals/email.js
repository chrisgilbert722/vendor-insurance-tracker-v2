// pages/api/renewals/email.js

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { vendorName, coverage, daysLeft, expDate } = req.body;

    const prompt = `
Generate a clean, short, professional renewal request email:

Vendor: ${vendorName}
Coverage: ${coverage}
Days Left: ${daysLeft}
Expiration: ${expDate}

Tone: friendly, direct, no fluff.
Audience: broker or underwriter.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const text = completion.choices[0].message.content.trim();

    return res.status(200).json({ ok: true, email: text });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
