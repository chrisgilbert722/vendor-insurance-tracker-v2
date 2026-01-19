// pages/api/orgs/bootstrap.js
// ============================================================
// BOOTSTRAP ORGANIZATION — SINGLE SOURCE OF TRUTH FOR ONBOARDING
// - Idempotent: Returns existing org OR creates new one
// - Uses Bearer token auth
// - Called once per session by ai-wizard.js
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // -------------------------------------------
    // 1. DATABASE CONNECTION
    // -------------------------------------------
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.error("[orgs/bootstrap] FATAL: DATABASE_URL not set");
      return res.status(500).json({ ok: false, error: "Database not configured" });
    }

    const sql = neon(DATABASE_URL);

    // -------------------------------------------
    // 2. BEARER TOKEN AUTH
    // -------------------------------------------
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("[orgs/bootstrap] FATAL: Missing Supabase env vars");
      return res.status(500).json({ ok: false, error: "Auth not configured" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Missing Authorization header" });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Empty token" });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    const user = data.user;
    const userId = user.id;
    const email = user.email || "";

    // -------------------------------------------
    // 3. CHECK FOR EXISTING ORG (IDEMPOTENT)
    // -------------------------------------------
    const existingRows = await sql`
      SELECT o.id, o.name, o.external_uuid, o.onboarding_step, o.onboarding_completed
      FROM organizations o
      JOIN organization_members om ON om.org_id = o.id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC
      LIMIT 1;
    `;

    if (existingRows && existingRows.length > 0 && existingRows[0]) {
      const existingOrg = existingRows[0];
      console.log("[orgs/bootstrap] IDEMPOTENT: Returning existing org:", existingOrg.id);

      // If onboarding already complete, tell client to redirect
      if (existingOrg.onboarding_completed === true) {
        return res.status(200).json({
          ok: true,
          org: existingOrg,
          action: "redirect_dashboard",
          created: false,
        });
      }

      return res.status(200).json({
        ok: true,
        org: existingOrg,
        action: "continue_onboarding",
        created: false,
      });
    }

    // -------------------------------------------
    // 4. CREATE NEW ORG
    // -------------------------------------------
    const orgName = email ? `${email.split("@")[0]}'s Organization` : "My Organization";
    const externalUuid = crypto.randomUUID();

    console.log("[orgs/bootstrap] Creating org:", orgName, "uuid:", externalUuid, "for user:", userId);

    let newOrg = null;
    try {
      const result = await sql`
        INSERT INTO organizations (name, external_uuid, onboarding_step, onboarding_completed)
        VALUES (${orgName}, ${externalUuid}, 0, FALSE)
        RETURNING id, name, external_uuid, onboarding_step, onboarding_completed;
      `;
      if (result && result.length > 0 && result[0]) {
        newOrg = result[0];
      }
    } catch (insertErr) {
      // Race condition: re-check for existing
      console.log("[orgs/bootstrap] Org insert failed, re-checking:", insertErr.message);
      const recheck = await sql`
        SELECT o.id, o.name, o.external_uuid, o.onboarding_step, o.onboarding_completed
        FROM organizations o
        JOIN organization_members om ON om.org_id = o.id
        WHERE om.user_id = ${userId}
        ORDER BY o.id ASC
        LIMIT 1;
      `;
      if (recheck && recheck.length > 0 && recheck[0]) {
        console.log("[orgs/bootstrap] IDEMPOTENT: Found org on recheck:", recheck[0].id);
        return res.status(200).json({
          ok: true,
          org: recheck[0],
          action: "continue_onboarding",
          created: false,
        });
      }
      throw insertErr;
    }

    if (!newOrg || !newOrg.id) {
      console.error("[orgs/bootstrap] INSERT returned empty result");
      return res.status(500).json({ ok: false, error: "Org insert returned no data" });
    }

    // -------------------------------------------
    // 5. INSERT MEMBERSHIP
    // -------------------------------------------
    await sql`
      INSERT INTO organization_members (org_id, user_id, role)
      VALUES (${newOrg.id}, ${userId}, 'owner')
      ON CONFLICT (org_id, user_id) DO NOTHING;
    `;

    console.log("[orgs/bootstrap] Org + member created:", newOrg.id);

    return res.status(200).json({
      ok: true,
      org: newOrg,
      action: "continue_onboarding",
      created: true,
    });

  } catch (err) {
    console.error("[orgs/bootstrap] Error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Bootstrap failed",
    });
  }
}
