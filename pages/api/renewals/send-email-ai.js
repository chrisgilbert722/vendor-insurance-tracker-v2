// pages/api/renewals/send-email-ai.js
// ==========================================================
// RENEWAL INTELLIGENCE V3 — STEP 4
// AI Renewal Email Assistant
// Generates & sends a renewal reminder email using OpenAI,
// based on vendor's policy expiration + requirements.
// ==========================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";
import { sendEmail } from "../../../lib/sendEmail";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ ok: false, error: "Use POST for this endpoint." });
    }

    const { vendorId, orgId } = req.body || {};

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "vendorId and orgId are required.",
      });
    }

    const vendorIdInt = parseInt(vendorId, 10);
    const orgIdInt = parseInt(orgId, 10);

    if (Number.isNaN(vendorIdInt) || Number.isNaN(orgIdInt)) {
      return res.status(400).json({
        ok: false,
        error: "vendorId and orgId must be numeric.",
      });
    }

    // -------------------------------------------------------
    // 1) Load vendor + latest policy
    // -------------------------------------------------------
    const vendorRows = await sql`
      SELECT
        v.id,
        v.vendor_name,
        v.email,
        v.work_type,
        v.requirements_json,
        v.last_uploaded_coi,
        v.last_uploaded_at,
        p.policy_number,
        p.carrier,
        p.expiration_date
      FROM vendors v
      LEFT JOIN policies p ON p.vendor_id = v.id
      WHERE v.id = ${vendorIdInt}
        AND v.org_id = ${orgIdInt}
      ORDER BY p.expiration_date DESC NULLS LAST
      LIMIT 1;
    `;

    if (vendorRows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found for this org.",
      });
    }

    const vendor = vendorRows[0];

    if (!vendor.email) {
      return res.status(400).json({
        ok: false,
        error: "Vendor has no email on file.",
      });
    }

    // -------------------------------------------------------
    // 2) Determine days to expire + urgency tier
    // -------------------------------------------------------
    const now = new Date();
    let daysToExpire = null;
    let urgency = "standard"; // standard | 30_day | 7_day | expired

    if (vendor.expiration_date) {
      const [mm, dd, yyyy] = vendor.expiration_date.split("/");
      const exp = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      const diffMs = exp - now;
      daysToExpire = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysToExpire < 0) urgency = "expired";
      else if (daysToExpire <= 7) urgency = "7_day";
      else if (daysToExpire <= 30) urgency = "30_day";
    }

    // -------------------------------------------------------
    // 3) Build AI prompt
    // -------------------------------------------------------
    const prompt = `
You are an insurance compliance assistant.

Write a short, professional email from a company's compliance team to one of its vendors reminding them to send or update their Certificate of Insurance (COI).

Context:

- Vendor name: ${vendor.vendor_name || "Vendor"}
- Work type: ${vendor.work_type || "Unknown"}
- Policy expiration date: ${
      vendor.expiration_date || "Unknown or not on file"
    }
- Days until expiration: ${daysToExpire === null ? "unknown" : daysToExpire}
- Urgency tier: ${urgency}
- Requirements JSON (what coverage is expected):
${JSON.stringify(vendor.requirements_json || {}, null, 2)}

Guidelines:
- Tone: clear, respectful, firm but not aggressive.
- If urgency is "expired": emphasize immediate action.
- If "7_day": emphasize urgency and risk of lapse.
- If "30_day": friendly reminder to renew early.
- If daysToExpire is unknown: ask them to confirm coverage and send a current COI.
- Do NOT use legal jargon; write in plain language.
- 2–4 short paragraphs max.

Return ONLY valid JSON in this format:

{
  "subject": "string",
  "body": "string with line breaks"
}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    let raw = completion.choices[0].message?.content?.trim() || "";
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1) {
      throw new Error("AI did not return JSON.");
    }

    const json = JSON.parse(raw.slice(first, last + 1));

    const subject =
      json.subject ||
      `Insurance COI Renewal Request for ${vendor.vendor_name || "Vendor"}`;

    const body =
      json.body ||
      `
Hi ${vendor.vendor_name || "there"},

This is a reminder to send us your updated Certificate of Insurance.

Thank you,
Compliance Team
      `.trim();

    // -------------------------------------------------------
    // 4) Send the email
    // -------------------------------------------------------
    await sendEmail({
      to: vendor.email,
      subject,
      body,
    });

    // -------------------------------------------------------
    // 5) Log to timeline
    // -------------------------------------------------------
    await sql`
      INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
      VALUES (
        ${orgIdInt},
        ${vendorIdInt},
        'renewal_email_sent_ai',
        ${"AI-generated renewal email sent to " + vendor.email},
        'info'
      );
    `;

    return res.status(200).json({
      ok: true,
      vendorId: vendorIdInt,
      orgId: orgIdInt,
      subject,
      body,
      daysToExpire,
      urgency,
    });
  } catch (err) {
    console.error("[RENEWAL EMAIL AI ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to send AI renewal email.",
    });
  }
}
