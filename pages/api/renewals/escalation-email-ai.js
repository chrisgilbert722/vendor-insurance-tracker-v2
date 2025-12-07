// pages/api/renewals/escalation-email-ai.js
// ==========================================================
// AI Escalation Email Generator
// Stage-based escalation:
// - Broker escalation
// - Internal team alert
// - Vendor termination warning
// ==========================================================

import { openai } from "../../../lib/openaiClient";
import { sendEmail } from "../../../lib/sendEmail";

export default async function handler(req, res) {
  try {
    const { type, vendor, org } = req.body || {};

    if (!type || !vendor) {
      return res.status(400).json({ ok: false, error: "Missing escalation type or vendor" });
    }

    const prompt = `
Write a short escalation email depending on the type:

Type: ${type}

Vendor:
${JSON.stringify(vendor, null, 2)}

Organization:
${JSON.stringify(org, null, 2)}

Rules:
- "broker_escalation": Firm, professional, emphasize urgency.
- "internal_escalation": Notify internal compliance that vendor is overdue.
- "termination_warning": Very serious tone, but not rude. Warn vendor of suspension.

Return JSON only:
{
  "subject": "...",
  "body": "..."
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message.content.trim();
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    const json = JSON.parse(raw.slice(first, last + 1));

    // SEND EMAIL
    await sendEmail({
      to: vendor.emailTarget,
      subject: json.subject,
      body: json.body,
    });

    return res.status(200).json({ ok: true, json });

  } catch (err) {
    console.error("[Escalation AI Error]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
