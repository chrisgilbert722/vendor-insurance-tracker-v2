// pages/api/onboarding/launch-system.js
// FINAL ONBOARDING STEP — Auto-Launch Compliance Engine
// Includes:
// ✔ Save company profile
// ✔ Save team invites
// ✔ Auto-send magic links
// ✔ Auto-onboard vendors
// ✔ Auto-run renewal predictions (stub)
// ✔ Auto-run Fix Cockpit for all vendors (stub)
// ✔ Mark onboarding complete
// ✔ Prepare dashboard tutorial

import { sql } from "../../../lib/db";

// Allow JSON body
export const config = {
  api: {
    bodyParser: true,
  },
};

// --------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------

// 🔥 1) Send a Magic Link to a user (team or broker)
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

// 🔥 2) Auto-create vendors in DB (stub — you can refine later)
async function autoCreateVendor(orgId, vendor) {
  try {
    // MODIFY TABLE NAME TO MATCH YOUR REAL "vendors" TABLE
    const result = await sql`
      INSERT INTO vendors (
        org_id,
        name,
        email,
        category,
        created_at
      )
      VALUES (
        ${orgId},
        ${vendor.name || null},
        ${vendor.email || null},
        ${vendor.category || "general"},
        NOW()
      )
      RETURNING id
    `;

    return result?.[0]?.id || null;
  } catch (err) {
    console.error("[launch-system] autoCreateVendor error:", err);
    return null;
  }
}

// 🔥 3) Auto-run Fix Cockpit V5 for vendor (stub)
async function runFixCockpit(vendorId, orgId) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/vendor/fix-plan?vendorId=${vendorId}&orgId=${orgId}`);
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/engine/run-v3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, orgId, dryRun: false }),
    });
  } catch (err) {
    console.error("[launch-system] Fix Cockpit auto-run error:", err);
  }
}

// 🔥 4) Auto-run renewal prediction (stub)
async function runRenewalPrediction(vendorId) {
  try {
    // You’ll replace this with your real renewal engine route
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/renewals/predict?vendorId=${vendorId}`);
  } catch (err) {
    console.error("[launch-system] Renewal prediction error:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

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
      return res.status(400).json({ ok: false, error: "Missing orgId." });
    }

    // --------------------------------------------------------------
    // 1) SAVE COMPANY PROFILE
    // --------------------------------------------------------------
    try {
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
    } catch (err) {
      console.error("[launch-system] Error saving company profile:", err);
      throw new Error("Failed to save company profile.");
    }

    // --------------------------------------------------------------
    // 2) SAVE TEAM INVITES + AUTO-SEND MAGIC LINKS
    // --------------------------------------------------------------
    try {
      for (const member of team || []) {
        await sql`
          INSERT INTO org_invites (
            org_id,
            name,
            email,
            role,
            created_at
          )
          VALUES (
            ${orgId},
            ${member.name},
            ${member.email},
            ${member.role},
            NOW()
          )
          ON CONFLICT (email, org_id) DO NOTHING;
        `;

        // Auto-send magic link
        await sendMagicLink(member.email);
      }
    } catch (err) {
      console.error("[launch-system] Error saving team invites:", err);
      throw new Error("Failed to save invited team members.");
    }

    // --------------------------------------------------------------
    // 3) AUTO-CREATE VENDORS + AUTO-RUN FIX COCKPIT + AUTO-RUN RENEWAL ENGINE
    // --------------------------------------------------------------
    const vendorIdMap = [];

    try {
      for (const vendor of vendors) {
        const vendorId = await autoCreateVendor(orgId, vendor);
        if (!vendorId) continue;

        vendorIdMap.push({ vendorId, vendor });

        // Auto-run Fix Cockpit for the vendor
        await runFixCockpit(vendorId, orgId);

        // Auto-run renewal predictions
        await runRenewalPrediction(vendorId);
      }
    } catch (err) {
      console.error("[launch-system] Vendor auto-onboarding error:", err);
    }

    // --------------------------------------------------------------
    // 4) STORE FULL AI-ONBOARDING HISTORY
    // --------------------------------------------------------------
    try {
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
          ${JSON.stringify(vendors || [])},
          ${JSON.stringify(vendorAi || {})},
          ${JSON.stringify(requirements || [])},
          ${JSON.stringify(rules || [])},
          ${JSON.stringify(fixPlans || [])},
          ${JSON.stringify(company || {})},
          ${JSON.stringify(team || [])},
          NOW()
        )
      `;
    } catch (err) {
      console.warn("[launch-system] Warning: onboarding_history insert failed.");
    }

    // --------------------------------------------------------------
    // 5) MARK ORG AS ONBOARDING COMPLETE
    // --------------------------------------------------------------
    try {
      await sql`
        UPDATE orgs
        SET onboarding_complete = TRUE
        WHERE id = ${orgId};
      `;
    } catch (err) {
      console.error("[launch-system] Error marking onboarding complete:", err);
      throw new Error("Failed to mark onboarding as complete.");
    }

    // --------------------------------------------------------------
    // 6) ENABLE DASHBOARD TUTORIAL
    // --------------------------------------------------------------
    try {
      await sql`
        UPDATE orgs
        SET dashboard_tutorial_enabled = TRUE
        WHERE id = ${orgId};
      `;
    } catch (err) {
      console.error("[launch-system] Dashboard tutorial flag failed:", err);
    }

    // --------------------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      message: "System launched. Org is now fully active.",
      vendorCount: vendorIdMap.length,
    });
  } catch (err) {
    console.error("[launch-system] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to launch compliance system.",
    });
  }
}
