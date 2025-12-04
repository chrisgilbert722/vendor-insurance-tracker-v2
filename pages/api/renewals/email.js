// pages/api/renewals/email.js
// AI Renewal Email Builder — Vendor + Broker

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST" });
  }

  try {
    const {
      orgId,
      vendorName,
      coverage,
      stage,     // 90, 30, 7, 3, 1, 0
      daysLeft,
      expDate,
      target,    // "vendor" | "broker"
    } = req.body;

    if (!orgId || !vendorName || !coverage || target == null) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId, vendorName, coverage or target.",
      });
    }

    const stageLabel =
      stage === 0
        ? "Expired"
        : stage === 1
        ? "1 Day Left"
        : stage === 3
        ? "3 Days Left"
        : stage === 7
        ? "7-Day Window"
        : stage === 30
        ? "30-Day Window"
        : stage === 90
        ? "90-Day Window"
        : "Upcoming";

    const tone =
      target === "vendor"
        ? "friendly, direct, non-technical"
        : "professional, concise, broker-to-underwriter tone";

    const recipient =
      target === "vendor"
        ? "the vendor contact"
        : "the broker or underwriter";

    const systemPrompt = `
You are an AI that drafts renewal emails.

Context:
- Org ID: ${orgId}
- Vendor: ${vendorName}
- Coverage: ${coverage}
- Stage label: ${stageLabel}
- Days left: ${daysLeft}
- Expiration date: ${expDate}
- Recipient type: ${target} (${recipient})

Requirements:
1. Generate a clear SUBJECT line.
2. Generate a BODY that:
   - States the coverage and expiration clearly.
   - Explains urgency based on days left/stage.
   - Requests the updated COI (or endorsement) with any missing items implied.
   - Has a short closing.
3. Tone: ${tone}.
4. Do NOT include filler or legalese. Keep it short and practical.

Return JSON:

{
  "subject": "...",
  "body": "..."
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.2,
    });

    const text = completion.choices[0].message.content || "";

    let parsed = { subject: "", body: "" };
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      const jsonChunk = text.slice(start, end + 1);
      parsed = JSON.parse(
        jsonChunk.replace(/```json/gi, "").replace(/```/g, "").trim()
      );
    } catch (err) {
      console.error("[renewals/email] JSON parse failed:", err);
      // fallback: treat entire text as body
      parsed = {
        subject: `Renewal request — ${coverage} for ${vendorName}`,
        body: text,
      };
    }

    return res.status(200).json({
      ok: true,
      subject: parsed.subject,
      body: parsed.body,
    });
  } catch (err) {
    console.error("[renewals/email] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
