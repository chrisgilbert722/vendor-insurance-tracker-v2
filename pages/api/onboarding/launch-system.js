// pages/api/onboarding/launch-system.js
// FINAL ONBOARDING STEP — Activate Org, Save Profile, Save Team, Prepare System Launch

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  try {
    const {
      orgId,
      vendors,
      vendorAi,
      requirements,
      rules,
      fixPlans,
      company,
      team,
    } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId." });
    }

    // --------------------------------------------------------------
    // 1) UPDATE COMPANY PROFILE (branding + contacts)
    // --------------------------------------------------------------
    // MODIFY TABLE NAME TO MATCH YOUR REAL SCHEMA
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
      // You can continue, but it's better to throw:
      throw new Error("Failed to save company profile.");
    }

    // --------------------------------------------------------------
    // 2) SAVE TEAM & BROKER INVITES
    // --------------------------------------------------------------
    // Modify this to match your `invites` or `users_pending` table.
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
      }
    } catch (err) {
      console.error("[launch-system] Error saving team invites:", err);
      throw new Error("Failed to save invited team members.");
    }

    // --------------------------------------------------------------
    // 3) STORE SUMMARY OF AI-ONBOARDING WIZARD (OPTIONAL BUT USEFUL)
    // --------------------------------------------------------------
    // You can use this for analytics, debugging, or audit logs.

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
      // Not fatal, but log it.
    }

    // --------------------------------------------------------------
    // 4) MARK ORG AS “ONBOARDING COMPLETE”
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
    // SUCCESS RESPONSE
    // --------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      message: "System launched. Org is now active.",
    });
  } catch (err) {
    console.error("[launch-system] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to launch compliance system.",
    });
  }
}
