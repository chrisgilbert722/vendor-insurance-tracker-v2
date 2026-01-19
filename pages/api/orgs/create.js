// pages/api/orgs/create.js
// ============================================================
// CREATE ORGANIZATION — Called when user starts onboarding
// Uses cookie-based auth via createPagesServerClient
// ============================================================

import { sql } from "@db";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // Cookie-based auth via Supabase auth helpers
    const supabase = createPagesServerClient({ req, res });
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      console.log("[orgs/create] No session found via cookies");
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

    // Generate external_uuid explicitly (don't rely on database DEFAULT)
    const externalUuid = crypto.randomUUID();

    // Create new organization
    const newOrgResult = await sql`
      INSERT INTO organizations (name, external_uuid, onboarding_step, onboarding_completed)
      VALUES (${orgName}, ${externalUuid}, 0, FALSE)
      RETURNING id, name, external_uuid, onboarding_step, onboarding_completed;
    `;

    if (!newOrgResult || !newOrgResult[0]) {
      return res.status(500).json({ ok: false, error: "Failed to create organization" });
    }

    const newOrg = newOrgResult[0];

    console.log("[orgs/create] Created org:", {
      id: newOrg.id,
      external_uuid: newOrg.external_uuid,
      name: newOrg.name,
    });

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
