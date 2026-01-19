// pages/api/orgs/create.js
// ============================================================
// CREATE ORGANIZATION — Called when user starts onboarding
// - Creates a new org for the authenticated user
// - Adds user as owner
// - Returns the new org
// ============================================================

import { sql } from "@db";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // Use session-based auth via cookies
    const supabase = createPagesServerClient({ req, res });
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

    const user = data.user;
    const userId = user.id;
    const email = user.email;

    // Check if user already has an org
    const existingOrgs = await sql`
      SELECT o.id, o.name, o.external_uuid, o.onboarding_step, o.onboarding_completed
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      LIMIT 1;
    `;

    if (existingOrgs.length > 0 && existingOrgs[0]) {
      return res.status(200).json({
        ok: true,
        org: existingOrgs[0],
        created: false,
      });
    }

    // Get org name from request body or generate from email
    const { name: requestedName } = req.body || {};
    const orgName = requestedName ||
      (email ? `${email.split("@")[0]}'s Organization` : "My Organization");

    // Create new organization
    const newOrgResult = await sql`
      INSERT INTO organizations (name, onboarding_step, onboarding_completed)
      VALUES (${orgName}, 0, FALSE)
      RETURNING id, name, external_uuid, onboarding_step, onboarding_completed;
    `;

    if (!newOrgResult || !newOrgResult[0]) {
      return res.status(500).json({ ok: false, error: "Failed to create organization" });
    }

    const newOrg = newOrgResult[0];

    // Add user as owner
    await sql`
      INSERT INTO organization_members (org_id, user_id, role)
      VALUES (${newOrg.id}, ${userId}, 'owner');
    `;

    return res.status(200).json({
      ok: true,
      org: newOrg,
      created: true,
    });
  } catch (err) {
    console.error("[orgs/create] error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal server error" });
  }
}
