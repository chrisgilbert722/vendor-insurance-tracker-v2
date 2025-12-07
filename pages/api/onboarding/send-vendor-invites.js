// pages/api/onboarding/send-vendor-invites.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 3 (AI Onboarding Emails)
// Uses vendor.requirements_json + OpenAI to send onboarding
// emails to vendors and logs in system_timeline.
// ==========================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";
import { sendEmail } from "../../../lib/sendEmail";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "Use POST method." });
    }

    const { orgId, vendorIds } = req.body || {};

    if (!orgId || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "orgId and vendorIds[] are required.",
      });
    }

    const orgIdInt = parseInt(orgId, 10);
    const vendorIdsInt = vendorIds.map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v));

    if (Number.isNaN(orgIdInt) || vendorIdsInt.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid orgId or vendorIds.",
      });
    }
    // -------------------------------------------------------
    // 1) LOAD VENDORS + REQUIREMENTS
    // -------------------------------------------------------
    const rows = await sql`
      SELECT
        id,
        org_id,
        vendor_name,
        email,
        requirements_json
      FROM vendors
      WHERE org_id = ${orgIdInt}
        AND id = ANY(${vendorIdsInt});
    `;

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        error: "No vendors found for this org and IDs.",
      });
    }

    const vendors = rows.filter((v) => v.email);

    if (!vendors.length) {
      return res.status(400).json({
        ok: false,
        error: "None of the selected vendors have an email on file.",
      });
    }
    // -------------------------------------------------------
    // 2) HELPER — AI GENERATE EMAIL CONTENT
    // -------------------------------------------------------
    async function generateEmailForVendor(vendor) {
      const requirements = vendor.requirements_json || {};

      const prompt = `
You are an insurance compliance assistant.

Write a friendly, professional onboarding email to this vendor:

Vendor name: ${vendor.vendor_name || "Vendor"}
Organization ID: ${vendor.org_id}

Insurance requirements JSON:
${JSON.stringify(requirements, null, 2)}

GOAL:
- Explain that the company is using an automated compliance platform.
- Summarize what coverages and documents are required.
- Invite them to upload their COI and any requested docs via their secure link.
- Use clear, simple, non-legal language.
- Be short and skimmable.

Return ONLY valid JSON in this format:

{
  "subject": "string",
  "body": "plain text body with line breaks"
}
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return ONLY valid JSON" },
          { role: "user", content: prompt },
        ],
      });

      let raw = completion.choices?.[0]?.message?.content?.trim() || "";
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first === -1 || last === -1) {
        throw new Error("AI did not return JSON.");
      }

      const json = JSON.parse(raw.slice(first, last + 1));

      return {
        subject: json.subject || "Insurance Requirements & COI Request",
        body: json.body || "",
      };
    }
    // -------------------------------------------------------
    // 3) LOOP VENDORS — GENERATE, SEND, LOG
    // -------------------------------------------------------
    const sent = [];
    const failed = [];

    for (const vendor of vendors) {
      try {
        if (!vendor.requirements_json) {
          failed.push({
            vendorId: vendor.id,
            reason: "Missing requirements_json; cannot generate onboarding email.",
          });

          await sql`
            INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
            VALUES (
              ${vendor.org_id},
              ${vendor.id},
              'onboarding_invite_skipped',
              'Skipped onboarding email: missing requirements_json',
              'warning'
            );
          `;

          continue;
        }

        const emailContent = await generateEmailForVendor(vendor);

        await sendEmail({
          to: vendor.email,
          subject: emailContent.subject,
          body: emailContent.body,
        });

        sent.push({
          vendorId: vendor.id,
          email: vendor.email,
          subject: emailContent.subject,
        });

        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (
            ${vendor.org_id},
            ${vendor.id},
            'onboarding_invite_sent',
            ${"Onboarding email sent to " + vendor.email},
            'info'
          );
        `;
      } catch (err) {
        console.error("[Onboarding email ERROR]", err);
        failed.push({
          vendorId: vendor.id,
          email: vendor.email,
          reason: err.message || "Unknown error",
        });

        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (
            ${vendor.org_id},
            ${vendor.id},
            'onboarding_invite_failed',
            ${"Onboarding email failed: " + (err.message || "Unknown")},
            'critical'
          );
        `;
      }
    }
    // -------------------------------------------------------
    // 4) RETURN SUMMARY
    // -------------------------------------------------------
    return res.status(200).json({
      ok: true,
      orgId: orgIdInt,
      totalRequested: vendorIdsInt.length,
      totalFound: rows.length,
      sentCount: sent.length,
      failedCount: failed.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("[send-vendor-invites ERROR]", err);

    try {
      await sql`
        INSERT INTO system_timeline (action, message, severity)
        VALUES ('onboarding_invite_system_error', ${err.message}, 'critical');
      `;
    } catch (e2) {
      console.error("[send-vendor-invites TIMELINE ERROR]", e2);
    }

    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error.",
    });
  }
}
