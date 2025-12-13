// pages/api/onboarding/send-vendor-invites.js
// ==========================================================
// AI ONBOARDING — SEND VENDOR INVITES (PATCHED)
// Backward compatible + Phase 2 Step 4 magic-link support
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

    const { orgId, vendorIds, invites } = req.body || {};
    const orgIdInt = parseInt(orgId, 10);

    if (Number.isNaN(orgIdInt)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid orgId.",
      });
    }

    // ======================================================
    // MODE A — PHASE 2 MAGIC-LINK INVITES (NEW)
    // ======================================================
    if (Array.isArray(invites) && invites.length > 0) {
      const sent = [];
      const failed = [];

      for (const invite of invites) {
        try {
          const {
            onboardId,
            vendorName,
            vendorEmail,
            subject,
            body,
            token,
            requirements,
          } = invite;

          if (!vendorEmail) {
            failed.push({
              onboardId,
              reason: "Missing vendor email.",
            });
            continue;
          }

          // Send exactly what operator approved
          await sendEmail({
            to: vendorEmail,
            subject,
            body,
          });

          sent.push({
            onboardId,
            vendorEmail,
            subject,
          });

          // Timeline log (org-level, vendor not yet persisted)
          await sql`
            INSERT INTO system_timeline (org_id, action, message, severity)
            VALUES (
              ${orgIdInt},
              'onboarding_magic_link_sent',
              ${`Magic link sent to ${vendorName || vendorEmail}`},
              'info'
            );
          `;
        } catch (err) {
          console.error("[Magic invite ERROR]", err);

          failed.push({
            onboardId: invite.onboardId,
            vendorEmail: invite.vendorEmail,
            reason: err.message || "Unknown error",
          });

          await sql`
            INSERT INTO system_timeline (org_id, action, message, severity)
            VALUES (
              ${orgIdInt},
              'onboarding_magic_link_failed',
              ${"Magic link send failed: " + (err.message || "Unknown")},
              'critical'
            );
          `;
        }
      }

      return res.status(200).json({
        ok: true,
        mode: "magic-link",
        sentCount: sent.length,
        failedCount: failed.length,
        sent,
        failed,
      });
    }

    // ======================================================
    // MODE B — LEGACY FLOW (vendorIds + AI-generated email)
    // ======================================================
    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "orgId and vendorIds[] are required.",
      });
    }

    const vendorIdsInt = vendorIds
      .map((v) => parseInt(v, 10))
      .filter((v) => !Number.isNaN(v));

    if (vendorIdsInt.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid vendorIds.",
      });
    }

    // -------------------------------------------------------
    // LOAD VENDORS + REQUIREMENTS
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
        error: "No vendors found.",
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
    // AI EMAIL GENERATION (LEGACY)
    // -------------------------------------------------------
    async function generateEmailForVendor(vendor) {
      const requirements = vendor.requirements_json || {};

      const prompt = `
Write a short onboarding email for this vendor.

Vendor: ${vendor.vendor_name}
Insurance requirements:
${JSON.stringify(requirements, null, 2)}

Return ONLY JSON:
{
  "subject": "string",
  "body": "plain text body"
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

      const raw = completion.choices?.[0]?.message?.content || "{}";
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

      return {
        subject: json.subject || "Insurance Requirements & COI Request",
        body: json.body || "",
      };
    }

    const sent = [];
    const failed = [];

    for (const vendor of vendors) {
      try {
        if (!vendor.requirements_json) {
          failed.push({
            vendorId: vendor.id,
            reason: "Missing requirements_json.",
          });
          continue;
        }

        const email = await generateEmailForVendor(vendor);

        await sendEmail({
          to: vendor.email,
          subject: email.subject,
          body: email.body,
        });

        sent.push({
          vendorId: vendor.id,
          email: vendor.email,
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
        console.error("[Legacy invite ERROR]", err);
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

    return res.status(200).json({
      ok: true,
      mode: "legacy",
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
    } catch {}

    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error.",
    });
  }
}
