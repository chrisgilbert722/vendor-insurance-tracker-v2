// pages/api/onboarding/launch-system.js
// ============================================================
// FINAL ONBOARDING STEP — Auto-Launch Compliance Engine
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";
import crypto from "crypto";

// Allow JSON body
export const config = {
  api: {
    bodyParser: true,
  },
};

/* ============================================================
   HELPERS
============================================================ */

// 1) Send magic-link to team/brokers
async function sendMagicLink(email) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/send-magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo: "/dashboard",
      }),
    });
  } catch (err) {
    console.error(`[launch-system] Failed to send magic link to ${email}`, err);
  }
}

// 2) Send vendor "Upload COI" invite
async function sendVendorInvite(email, vendorName, uploadUrl) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/onboarding/send-vendor-invite`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, vendorName, uploadUrl }),
      }
    );
  } catch (err) {
    console.error("[launch-system] Vendor invite email failed:", err);
  }
}

// 3) Auto-run Fix Cockpit V5 for a vendor
async function runFixCockpit(vendorId, orgIdInt) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/vendor/fix-plan?vendorId=${vendorId}&orgId=${orgIdInt}`
    );

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/engine/run-v3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, orgId: orgIdInt, dryRun: false }),
    });
  } catch (err) {
    console.error("[launch-system] Fix Cockpit auto-run error:", err);
  }
}

// 4) Auto-run Renewal Predictions (stub)
async function runRenewalPrediction(vendorId) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/renewals/predict?vendorId=${vendorId}`
    );
  } catch (err) {
    console.error("[launch-system] Renewal prediction error:", err);
  }
}

/* ============================================================
   AUTO-CREATE VENDOR
============================================================ */
async function autoCreateVendor(orgIdInt, vendor) {
  try {
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const rows = await sql`
      INSERT INTO vendors (
        org_id,
        name,
        email,
        upload_token,
        upload_token_expires_at,
        created_at
      )
      VALUES (
        ${orgIdInt},
        ${vendor.name || null},
        ${vendor.email || null},
        ${token},
        ${expiresAt},
        NOW()
      )
      RETURNING id, name, email, upload_token;
    `;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${process.env.VERCEL_URL || "localhost:3000"}`;

    const uploadUrl = `${baseUrl}/vendor-upload?token=${rows[0].upload_token}`;

    return {
      vendorId: rows[0].id,
      name: rows[0].name,
      email: rows[0].email,
      uploadUrl,
    };
  } catch (err) {
    console.error("[launch-system] autoCreateVendor ERROR:", err);
    return null;
  }
}

/* ============================================================
   MAIN HANDLER
============================================================ */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const {
      vendors = [],
      vendorAi = {},
      requirements = [],
      rules = [],
      fixPlans = [],
      company = {},
      team = [],
    } = req.body || {};

    // 🔑 Resolve external_uuid → INTERNAL org INT
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    /* ============================================================
       1) SAVE COMPANY PROFILE
    ============================================================= */
    await sql`
      UPDATE organizations
      SET
        legal_name = ${company.companyName || null},
        address = ${company.address || null},
        phone = ${company.phone || null},
        website = ${company.website || null},
        primary_contact_name = ${company.primaryContactName || null},
        primary_contact_email = ${company.primaryContactEmail || null},
        timezone = ${company.timezone || null},
        brand_color = ${company.brandColor || null},
        updated_at = NOW()
      WHERE id = ${orgIdInt};
    `;

    /* ============================================================
       2) SAVE TEAM & SEND MAGIC LINKS
    ============================================================= */
    for (const member of team || []) {
      await sql`
        INSERT INTO org_invites (org_id, name, email, role, created_at)
        VALUES (${orgIdInt}, ${member.name}, ${member.email}, ${member.role}, NOW())
        ON CONFLICT (email, org_id) DO NOTHING;
      `;
      await sendMagicLink(member.email);
    }

    /* ============================================================
       3) AUTO-CREATE VENDORS
    ============================================================= */
    const onboardedVendors = [];

    for (const v of vendors || []) {
      const created = await autoCreateVendor(orgIdInt, v);
      if (!created) continue;

      onboardedVendors.push(created);

      if (created.email) {
        await sendVendorInvite(created.email, created.name, created.uploadUrl);
      }

      await runFixCockpit(created.vendorId, orgIdInt);
      await runRenewalPrediction(created.vendorId);
    }

    /* ============================================================
       4) AI ACTIVITY LOG — LAUNCH SYSTEM
    ============================================================= */
    await sql`
      INSERT INTO ai_activity_log (org_id, event_type, message, metadata)
      VALUES (
        ${orgIdInt},
        'launch_system',
        'Compliance engine launched',
        ${JSON.stringify({
          vendorsCreated: onboardedVendors.length,
          teamInvited: team.length,
          rulesApplied: rules.length,
          fixPlansRun: onboardedVendors.length,
        })}
      );
    `;

    /* ============================================================
       5) MARK ONBOARDING COMPLETE
    ============================================================= */
    await sql`
      UPDATE organizations
      SET
        onboarding_step = onboarding_step + 1,
        dashboard_tutorial_enabled = TRUE
      WHERE id = ${orgIdInt};
    `;

    return res.status(200).json({
      ok: true,
      message: "Compliance Engine Activated.",
      vendorsCreated: onboardedVendors.length,
    });
  } catch (err) {
    console.error("[launch-system] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to launch compliance system.",
    });
  }
}
