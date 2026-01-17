// pages/api/orgs/create.js
// ============================================================
// CREATE ORGANIZATION — Called when user starts onboarding
// - Creates a new org for the authenticated user
// - Adds user as owner
// - Returns the new org
// ============================================================

import { sql } from "@db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = data.user.id;
    const email = data.user.email;

    // Check if user already has an org
    const existingOrgs = await sql`
      SELECT o.id
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      LIMIT 1;
    `;

    if (existingOrgs.length > 0) {
      // Return existing org instead of creating duplicate
      const existingOrg = await sql`
        SELECT id, name, external_uuid, onboarding_step, onboarding_completed
        FROM organizations
        WHERE id = ${existingOrgs[0].id}
        LIMIT 1;
      `;

      return res.status(200).json({
        ok: true,
        org: existingOrg[0],
        created: false,
        message: "User already has an organization",
      });
    }

    // Get org name from request body or generate from email
    const { name: requestedName } = req.body || {};
    const orgName = requestedName ||
      (email ? `${email.split("@")[0]}'s Organization` : "My Organization");

    // Create new organization
    const [newOrg] = await sql`
      INSERT INTO organizations (name, onboarding_step, onboarding_completed)
      VALUES (${orgName}, 0, FALSE)
      RETURNING id, name, external_uuid, onboarding_step, onboarding_completed;
    `;

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
    return res.status(500).json({ ok: false, error: err.message });
  }
}
