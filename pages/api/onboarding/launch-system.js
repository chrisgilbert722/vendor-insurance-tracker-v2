// pages/api/onboarding/launch-system.js
// FINAL ONBOARDING STEP — Auto-Launch Compliance Engine
// Includes:
// ✔ Save company profile
// ✔ Save team invites
// ✔ Auto-send magic links
// ✔ Auto-onboard vendors
// ✔ Auto-send vendor COI upload invitations (OPTION A)
// ✔ Auto-run renewal predictions (stub)
// ✔ Auto-run Fix Cockpit for all vendors (stub)
// ✔ Mark onboarding complete
// ✔ Prepare dashboard tutorial

import { sql } from "../../../lib/db";
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

// 2) Send vendor "Upload COI" invite (OPTION A)
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
    console.error(`[launch-system] Vendor invite email failed:`, err);
  }
}

// 3) Auto-run Fix Cockpit V5 for a vendor
async function runFixCockpit(vendorId, orgId) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/vendor/fix-plan?vendorId=${vendorId}&orgId=${orgId}`
    );

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/engine/run-v3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, orgId, dryRun: false }),
    });
  } catch (err) {
    console.error("[launch-system] Fix Cockpit auto-run error:", err);
  }
}

// 4) Auto-run Renewal Predictions (stub — safe to keep)
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
   AUTO-CREATE VENDOR (NOW WITH TOKEN + UPLOAD URL + EMAIL INVITE)
============================================================ */
async function autoCreateVendor(orgId, vendor) {
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
        ${orgId},
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
   MAIN ONBOARDING LAUNCH HANDLER
============================================================ */

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Use POST" });

  try {
    const {
      orgId,
      vendors = [],
      vendorAi = {},
      requirements = [],
      rules = [],
      fixPlans = [],
      company,
      team = [],
    } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    /* ============================================================
       1) SAVE COMPANY PROFILE
    ============================================================= */
    await sql`
      UPDATE orgs
      SET
        company_name = ${company.companyName || null},
        address = ${company.address || null},
        phone = ${company.phone || null},
        website = ${company.website || null},
        primary_contact_name = ${company.primaryContactName || null},
        primary_contact_email = ${company.primaryContactEmail || null},
        timezone = ${company.timezone || null},
        brand_color = ${company.brandColor || null},
        updated_at = NOW()
      WHERE id = ${orgId};
    `;

    /* ============================================================
       2) SAVE TEAM & AUTO-SEND MAGIC LINKS
    ============================================================= */
    for (const member of team || []) {
      await sql`
        INSERT INTO org_invites (org_id, name, email, role, created_at)
        VALUES (${orgId}, ${member.name}, ${member.email}, ${member.role}, NOW())
        ON CONFLICT (email, org_id) DO NOTHING;
      `;

      await sendMagicLink(member.email);
    }

    /* ============================================================
       3) AUTO-CREATE VENDORS + SEND UPLOAD INVITES (OPTION A)
    ============================================================= */
    const onboardedVendors = [];

    for (const v of vendors || []) {
      const created = await autoCreateVendor(orgId, v);
      if (!created) continue;

      onboardedVendors.push(created);

      // Auto-email vendor their COI upload link (OPTION A)
      if (created.email) {
        await sendVendorInvite(created.email, created.name, created.uploadUrl);
      }

      // Engines
      await runFixCockpit(created.vendorId, orgId);
      await runRenewalPrediction(created.vendorId);
    }

    /* ============================================================
       4) SAVE ONBOARDING HISTORY
    ============================================================= */
    await sql`
      INSERT INTO onboarding_history (
        org_id,
        vendors_json,
        vendor_ai_json,
        requirements_json,
        rule_groups_json,
        fix_plans_json,
        company_profile_json,
        team_json,
        completed_at
      )
      VALUES (
        ${orgId},
        ${JSON.stringify(vendors)},
        ${JSON.stringify(vendorAi)},
        ${JSON.stringify(requirements)},
        ${JSON.stringify(rules)},
        ${JSON.stringify(fixPlans)},
        ${JSON.stringify(company)},
        ${JSON.stringify(team)},
        NOW()
      )
    `;

    /* ============================================================
       5) MARK ONBOARDING COMPLETE + ENABLE TUTORIAL
    ============================================================= */
    await sql`
      UPDATE orgs
      SET onboarding_complete = TRUE,
          dashboard_tutorial_enabled = TRUE
      WHERE id = ${orgId};
    `;

    /* ============================================================
       SUCCESS RESPONSE
    ============================================================= */
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
