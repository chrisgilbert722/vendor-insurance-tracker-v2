// pages/api/onboarding/bulk-nudge.js
// ==========================================================
// BULK NUDGE + RENEWAL REMINDER ENGINE (Step 5)
// Sends tailored emails to vendors and logs timeline entries.
// ==========================================================

import { sql } from "../../../lib/db";
import { sendEmail } from "../../../lib/sendEmail";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "Use POST method." });
    }

    const { orgId, vendorIds, mode } = req.body || {};

    if (!orgId || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "orgId and vendorIds[] are required.",
      });
    }

    const orgIdInt = parseInt(orgId, 10);
    const vendorIdsInt = vendorIds
      .map((v) => parseInt(v, 10))
      .filter((v) => !Number.isNaN(v));

    if (Number.isNaN(orgIdInt) || vendorIdsInt.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid orgId or vendorIds.",
      });
    }

    // -------------------------------------------------------
    // 1) LOAD VENDORS
    // -------------------------------------------------------
    const rows = await sql`
      SELECT
        id,
        org_id,
        vendor_name,
        email,
        last_uploaded_coi,
        requirements_json
      FROM vendors
      WHERE org_id = ${orgIdInt}
        AND id = ANY(${vendorIdsInt});
    `;

    const vendors = rows.filter((v) => v.email);
    if (!vendors.length) {
      return res.status(400).json({
        ok: false,
        error: "No vendors with email found.",
      });
    }

    // -------------------------------------------------------
    // 2) EMAIL TEMPLATE PER MODE
    // -------------------------------------------------------
    function buildEmail(vendor) {
      const name = vendor.vendor_name || "Vendor";

      if (mode === "missing_coi") {
        return {
          subject: `Reminder: COI required for ${name}`,
          body: `
Hi ${name},

Our records indicate that we have not yet received a current Certificate of Insurance (COI) for your account.

To stay compliant and avoid any interruption in work, please upload your COI as soon as possible using your secure upload link.

If you believe this is in error or have already sent the document, simply reply to this email so our team can confirm.

Thank you,
Compliance Team
          `.trim(),
        };
      }

      if (mode === "coverage_issues") {
        return {
          subject: `Action Needed: Insurance coverage updates for ${name}`,
          body: `
Hi ${name},

As part of our ongoing insurance review, we identified one or more coverage items that do not fully meet the current requirements for your work with us.

Please review your policy and upload updated documentation, or provide information about your current coverage using your secure upload link.

If you have any questions about what is needed, reply to this email and our compliance team will help clarify.

Thank you,
Compliance Team
          `.trim(),
        };
      }

      // Default = renewal reminder
      return {
        subject: `Upcoming Insurance Renewal Reminder for ${name}`,
        body: `
Hi ${name},

This is a friendly reminder that your current insurance documentation on file is approaching its renewal period.

To avoid any lapse in compliance, please upload your renewed Certificate of Insurance and any updated documents as soon as they are available.

You can use your secure upload link to send updated files directly to our system.

Thank you for your prompt attention,
Compliance Team
        `.trim(),
      };
    }

    // -------------------------------------------------------
    // 3) SEND EMAILS + LOG TIMELINE
    // -------------------------------------------------------
    const sent = [];
    const failed = [];

    for (const vendor of vendors) {
      try {
        const emailContent = buildEmail(vendor);

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

        const action =
          mode === "missing_coi"
            ? "nudge_missing_coi"
            : mode === "coverage_issues"
            ? "nudge_coverage_issues"
            : "nudge_renewal";

        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (
            ${vendor.org_id},
            ${vendor.id},
            ${action},
            ${"Bulk nudge sent (" + mode + ") to " + vendor.email},
            'info'
          );
        `;
      } catch (err) {
        console.error("[bulk-nudge email error]", err);
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
            'nudge_failed',
            ${"Bulk nudge failed: " + (err.message || "Unknown")},
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
      requested: vendorIdsInt.length,
      found: rows.length,
      sentCount: sent.length,
      failedCount: failed.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("[bulk-nudge ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error.",
    });
  }
}
