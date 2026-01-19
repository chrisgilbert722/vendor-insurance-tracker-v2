// pages/api/orgs/create.js
// ============================================================
// CREATE ORGANIZATION — CRASH-PROOF API ENDPOINT
// ============================================================

import { createServerClient } from "@supabase/ssr";
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
      console.error("[orgs/create] FATAL: Failed to init DB client:", dbInitErr.message, dbInitErr.stack);
      return res.status(500).json({ ok: false, error: "Database client failed: " + dbInitErr.message });
    }

    // -------------------------------------------
    // 3. SUPABASE AUTH (cookie-based via @supabase/ssr)
    // -------------------------------------------
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[orgs/create] FATAL: Missing Supabase env vars");
      return res.status(500).json({ ok: false, error: "Supabase not configured" });
    }

    let supabase;
    try {
      supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          getAll() {
            // Parse cookies from request
            const cookieHeader = req.headers.cookie || "";
            const cookies = [];
            cookieHeader.split(";").forEach((cookie) => {
              const [name, ...rest] = cookie.trim().split("=");
              if (name) {
                cookies.push({ name, value: rest.join("=") });
              }
            });
            return cookies;
          },
          setAll(cookiesToSet) {
            // Set cookies on response
            cookiesToSet.forEach(({ name, value, options }) => {
              res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`);
            });
          },
        },
      });
    } catch (authInitErr) {
      console.error("[orgs/create] FATAL: Supabase client init failed:", authInitErr.message, authInitErr.stack);
      return res.status(500).json({ ok: false, error: "Auth client failed: " + authInitErr.message });
    }

    let userData;
    try {
      userData = await supabase.auth.getUser();
    } catch (authCallErr) {
      console.error("[orgs/create] FATAL: getUser() threw:", authCallErr.message, authCallErr.stack);
      return res.status(500).json({ ok: false, error: "Auth call failed: " + authCallErr.message });
    }

    const { data, error: authError } = userData;

    if (authError) {
      console.error("[orgs/create] Auth error:", authError.message);
      return res.status(401).json({ ok: false, error: "Auth error: " + authError.message });
    }

    if (!data || !data.user) {
      console.log("[orgs/create] No user in session");
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const user = data.user;
    const userId = user.id;
    const email = user.email || "";

    // -------------------------------------------
    // 4. VALIDATE USER ID
    // -------------------------------------------
    if (!userId || typeof userId !== "string") {
      console.error("[orgs/create] FATAL: Invalid userId:", userId);
      return res.status(500).json({ ok: false, error: "Invalid user ID from auth" });
    }

    console.log("[orgs/create] Auth OK. userId:", userId, "email:", email);

    // -------------------------------------------
    // 5. CHECK FOR EXISTING ORG
    // -------------------------------------------
    let existingOrgs;
    try {
      existingOrgs = await sql`
        SELECT o.id, o.name, o.external_uuid, o.onboarding_step, o.onboarding_completed
        FROM organization_members om
        JOIN organizations o ON o.id = om.org_id
        WHERE om.user_id = ${userId}
        LIMIT 1;
      `;
    } catch (selectErr) {
      console.error("[orgs/create] DB SELECT failed:", selectErr.message, selectErr.stack, "userId:", userId);
      return res.status(500).json({ ok: false, error: "DB select failed: " + selectErr.message });
    }

    if (existingOrgs && existingOrgs.length > 0 && existingOrgs[0]) {
      const existingOrg = existingOrgs[0];
      console.log("[orgs/create] Returning existing org:", existingOrg.id);
      return res.status(200).json({
        ok: true,
        org: existingOrg,
        created: false,
      });
    }

    // -------------------------------------------
    // 6. GENERATE ORG DATA
    // -------------------------------------------
    let orgName;
    try {
      const body = req.body || {};
      const requestedName = body.name;
      orgName = requestedName || (email ? `${email.split("@")[0]}'s Organization` : "My Organization");
    } catch (bodyErr) {
      orgName = "My Organization";
    }

    const externalUuid = crypto.randomUUID();
    if (!externalUuid) {
      console.error("[orgs/create] FATAL: crypto.randomUUID() returned falsy");
      return res.status(500).json({ ok: false, error: "UUID generation failed" });
    }

    console.log("[orgs/create] Creating org:", orgName, "uuid:", externalUuid);

    // -------------------------------------------
    // 7. INSERT ORGANIZATION
    // -------------------------------------------
    let newOrgResult;
    try {
      newOrgResult = await sql`
        INSERT INTO organizations (name, external_uuid, onboarding_step, onboarding_completed)
        VALUES (${orgName}, ${externalUuid}, 0, FALSE)
        RETURNING id, name, external_uuid, onboarding_step, onboarding_completed;
      `;
    } catch (insertErr) {
      console.error("[orgs/create] DB INSERT org failed:", insertErr.message, insertErr.stack, "orgName:", orgName, "uuid:", externalUuid);
      return res.status(500).json({ ok: false, error: "DB insert org failed: " + insertErr.message });
    }

    if (!newOrgResult || !Array.isArray(newOrgResult) || newOrgResult.length === 0 || !newOrgResult[0]) {
      console.error("[orgs/create] INSERT returned empty result:", newOrgResult);
      return res.status(500).json({ ok: false, error: "Org insert returned no data" });
    }

    const newOrg = newOrgResult[0];
    const orgId = newOrg.id;

    if (!orgId) {
      console.error("[orgs/create] FATAL: newOrg.id is falsy:", newOrg);
      return res.status(500).json({ ok: false, error: "Org created but ID is missing" });
    }

    console.log("[orgs/create] Org created:", orgId, newOrg.external_uuid);

    // -------------------------------------------
    // 8. INSERT ORGANIZATION MEMBER (FK safe)
    // -------------------------------------------
    try {
      await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${orgId}, ${userId}, 'owner');
      `;
      console.log("[orgs/create] Member added:", userId, "->", orgId);
    } catch (memberErr) {
      console.error("[orgs/create] DB INSERT member failed:", memberErr.message, memberErr.stack, "orgId:", orgId, "userId:", userId);
      // Return org anyway — it exists, membership just failed
      return res.status(200).json({
        ok: true,
        org: newOrg,
        created: true,
        warning: "Member insert failed: " + memberErr.message,
      });
    }

    // -------------------------------------------
    // 9. SUCCESS
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
    const stack = err && err.stack ? err.stack : "No stack";
    console.error("[orgs/create] UNCAUGHT ERROR:", message, stack);
    return res.status(500).json({ ok: false, error: message });
  }
}
