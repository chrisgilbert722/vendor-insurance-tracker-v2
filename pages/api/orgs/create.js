// pages/api/orgs/create.js
// ============================================================
// CREATE ORGANIZATION — Called when user starts onboarding
// Supports both cookie-based auth AND Bearer token auth
// ============================================================

import { sql } from "@db";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    let user = null;

    // Try 1: Cookie-based auth via createPagesServerClient
    try {
      const supabaseCookie = createPagesServerClient({ req, res });
      const { data, error } = await supabaseCookie.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {}

    // Try 2: Bearer token auth (fallback)
    if (!user) {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (token) {
        try {
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          );
          const { data, error } = await supabaseAdmin.auth.getUser(token);
          if (!error && data?.user) {
            user = data.user;
          }
        } catch {}
      }
    }

    // No auth found
    if (!user) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

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
