// pages/api/orgs/create.js
// ============================================================
// CREATE ORGANIZATION — IDEMPOTENT, CRASH-PROOF API ENDPOINT
// Uses Bearer token auth (token from Authorization header)
// ALWAYS returns 200 with JSON in normal operation
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";

export default async function handler(req, res) {
  // SINGLE outer try/catch — NOTHING can escape
  try {
    // -------------------------------------------
    // 1. METHOD CHECK
    // -------------------------------------------
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    // -------------------------------------------
    // 2. DATABASE CONNECTION (lazy, validated)
    // -------------------------------------------
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      console.error("[orgs/create] FATAL: DATABASE_URL is not set");
      return res.status(500).json({ ok: false, error: "Database not configured" });
    }

    let sql;
    try {
      sql = neon(DATABASE_URL);
    } catch (dbInitErr) {
      console.error("[orgs/create] FATAL: Failed to init DB client:", dbInitErr.message);
      return res.status(500).json({ ok: false, error: "Database client failed" });
    }

    // -------------------------------------------
    // 3. BEARER TOKEN AUTH
    // -------------------------------------------
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("[orgs/create] FATAL: Missing Supabase env vars");
      return res.status(500).json({ ok: false, error: "Supabase not configured" });
    }

    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "Missing Authorization header" });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Empty token" });
    }

    let supabaseAdmin;
    try {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    } catch (clientErr) {
      console.error("[orgs/create] FATAL: Supabase client init failed:", clientErr.message);
      return res.status(500).json({ ok: false, error: "Auth client failed" });
    }

    let userData;
    try {
      userData = await supabaseAdmin.auth.getUser(token);
    } catch (authCallErr) {
      console.error("[orgs/create] FATAL: getUser(token) threw:", authCallErr.message);
      return res.status(500).json({ ok: false, error: "Auth call failed" });
    }

    const { data, error: authError } = userData;

    if (authError) {
      return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    if (!data || !data.user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const user = data.user;
    const userId = user.id;
    const email = user.email || "";

    if (!userId || typeof userId !== "string") {
      console.error("[orgs/create] FATAL: Invalid userId:", userId);
      return res.status(500).json({ ok: false, error: "Invalid user ID from auth" });
    }

    // -------------------------------------------
    // 4. CHECK FOR EXISTING ORG (IDEMPOTENT)
    // -------------------------------------------
    let existingOrg = null;
    try {
      const rows = await sql`
        SELECT o.id, o.name, o.external_uuid, o.onboarding_step, o.onboarding_completed
        FROM organizations o
        JOIN organization_members om ON om.org_id = o.id
        WHERE om.user_id = ${userId}
        ORDER BY o.id ASC
        LIMIT 1;
      `;
      if (rows && rows.length > 0 && rows[0]) {
        existingOrg = rows[0];
      }
    } catch (selectErr) {
      console.error("[orgs/create] DB SELECT failed:", selectErr.message);
      return res.status(500).json({ ok: false, error: "DB select failed" });
    }

    // If user already has an org, return it immediately (IDEMPOTENT)
    if (existingOrg) {
      console.log("[orgs/create] IDEMPOTENT: Returning existing org:", existingOrg.id);
      return res.status(200).json({
        ok: true,
        org: existingOrg,
        created: false,
      });
    }

    // -------------------------------------------
    // 5. GENERATE ORG DATA
    // -------------------------------------------
    let orgName;
    try {
      const body = req.body || {};
      const requestedName = body.name;
      orgName = requestedName || (email ? `${email.split("@")[0]}'s Organization` : "My Organization");
    } catch {
      orgName = "My Organization";
    }

    const externalUuid = crypto.randomUUID();

    console.log("[orgs/create] Creating org:", orgName, "uuid:", externalUuid, "for user:", userId);

    // -------------------------------------------
    // 6. INSERT ORGANIZATION (handle race condition)
    // -------------------------------------------
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
      // Race condition: another request may have created org + membership
      // Re-check for existing org before failing
      console.log("[orgs/create] Org insert failed, re-checking for existing:", insertErr.message);
      try {
        const recheck = await sql`
          SELECT o.id, o.name, o.external_uuid, o.onboarding_step, o.onboarding_completed
          FROM organizations o
          JOIN organization_members om ON om.org_id = o.id
          WHERE om.user_id = ${userId}
          ORDER BY o.id ASC
          LIMIT 1;
        `;
        if (recheck && recheck.length > 0 && recheck[0]) {
          console.log("[orgs/create] IDEMPOTENT: Found org on recheck:", recheck[0].id);
          return res.status(200).json({
            ok: true,
            org: recheck[0],
            created: false,
          });
        }
      } catch {}
      // Truly failed
      console.error("[orgs/create] DB INSERT org failed:", insertErr.message);
      return res.status(500).json({ ok: false, error: "DB insert org failed" });
    }

    if (!newOrg || !newOrg.id) {
      console.error("[orgs/create] INSERT returned empty result");
      return res.status(500).json({ ok: false, error: "Org insert returned no data" });
    }

    console.log("[orgs/create] Org created:", newOrg.id);

    // -------------------------------------------
    // 7. INSERT MEMBERSHIP (ON CONFLICT DO NOTHING)
    // -------------------------------------------
    try {
      await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${newOrg.id}, ${userId}, 'owner')
        ON CONFLICT (org_id, user_id) DO NOTHING;
      `;
      console.log("[orgs/create] Member added:", userId, "->", newOrg.id);
    } catch (memberErr) {
      // If ON CONFLICT syntax not supported, try plain insert and ignore duplicate error
      if (memberErr.message && memberErr.message.includes("duplicate")) {
        console.log("[orgs/create] Membership already exists (duplicate key)");
      } else {
        console.error("[orgs/create] DB INSERT member failed:", memberErr.message);
        // Still return the org - it exists
        return res.status(200).json({
          ok: true,
          org: newOrg,
          created: true,
          warning: "Member insert failed",
        });
      }
    }

    // -------------------------------------------
    // 8. SUCCESS
    // -------------------------------------------
    return res.status(200).json({
      ok: true,
      org: newOrg,
      created: true,
    });

  } catch (err) {
    // -------------------------------------------
    // GLOBAL CATCH — nothing escapes
    // -------------------------------------------
    const message = err && err.message ? err.message : "Unknown error";
    console.error("[orgs/create] UNCAUGHT ERROR:", message);
    return res.status(500).json({ ok: false, error: message });
  }
}
