// pages/api/orgs/create.js
// ============================================================
// CREATE ORGANIZATION — Called when user starts onboarding
// Uses cookie-based auth via createPagesServerClient
// ============================================================

import { sql } from "../../../lib/db";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import crypto from "crypto";

export default async function handler(req, res) {
  // Ensure we always return JSON, even on unexpected errors
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    // Cookie-based auth via Supabase auth helpers
    let supabase;
    try {
      supabase = createPagesServerClient({ req, res });
    } catch (clientErr) {
      console.error("[orgs/create] Failed to create Supabase client:", clientErr);
      return res.status(500).json({ ok: false, error: "Auth client initialization failed" });
    }

    const { data, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[orgs/create] Auth error:", authError);
      return res.status(401).json({ ok: false, error: "Authentication failed" });
    }

    if (!data?.user) {
      console.log("[orgs/create] No session found via cookies");
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }

    const user = data.user;
    const userId = user.id;
    const email = user.email;

    console.log("[orgs/create] Authenticated user:", userId);

    // Check if user already has an org
    let existingOrgs;
    try {
      existingOrgs = await sql`
        SELECT o.id, o.name, o.external_uuid, o.onboarding_step, o.onboarding_completed
        FROM organization_members om
        JOIN organizations o ON o.id = om.org_id
        WHERE om.user_id = ${userId}
        LIMIT 1;
      `;
    } catch (dbErr) {
      console.error("[orgs/create] DB error checking existing orgs:", dbErr);
      return res.status(500).json({ ok: false, error: "Database query failed: " + dbErr.message });
    }

    if (existingOrgs && existingOrgs.length > 0 && existingOrgs[0]) {
      console.log("[orgs/create] Returning existing org:", existingOrgs[0].id);
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
    let newOrgResult;
    try {
      newOrgResult = await sql`
        INSERT INTO organizations (name, external_uuid, onboarding_step, onboarding_completed)
        VALUES (${orgName}, ${externalUuid}, 0, FALSE)
        RETURNING id, name, external_uuid, onboarding_step, onboarding_completed;
      `;
    } catch (insertErr) {
      console.error("[orgs/create] DB error inserting org:", insertErr);
      return res.status(500).json({ ok: false, error: "Failed to insert organization: " + insertErr.message });
    }

    if (!newOrgResult || !newOrgResult[0]) {
      console.error("[orgs/create] Insert returned no result");
      return res.status(500).json({ ok: false, error: "Failed to create organization - no result returned" });
    }

    const newOrg = newOrgResult[0];

    console.log("[orgs/create] Created org:", {
      id: newOrg.id,
      external_uuid: newOrg.external_uuid,
      name: newOrg.name,
    });

    // Add user as owner
    try {
      await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${newOrg.id}, ${userId}, 'owner');
      `;
    } catch (memberErr) {
      console.error("[orgs/create] DB error adding member:", memberErr);
      // Org was created, so return it anyway but log the error
      return res.status(200).json({
        ok: true,
        org: newOrg,
        created: true,
        warning: "Org created but member assignment failed",
      });
    }

    return res.status(200).json({
      ok: true,
      org: newOrg,
      created: true,
    });
  } catch (err) {
    console.error("[orgs/create] Unexpected error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}
