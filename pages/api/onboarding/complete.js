// pages/api/onboarding/complete.js
// ============================================================
// FINALIZE ONBOARDING — IDEMPOTENT, BEARER TOKEN AUTH
// - Marks onboarding_completed = true in DB
// - Uses Bearer token auth (consistent with other endpoints)
// - Idempotent: safe to call multiple times
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { neon } from "@neondatabase/serverless";

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
      console.error("[onboarding/complete] FATAL: DATABASE_URL not set");
      return res.status(500).json({ ok: false, error: "Database not configured" });
    }

    const sql = neon(DATABASE_URL);

    // -------------------------------------------
    // 2. BEARER TOKEN AUTH
    // -------------------------------------------
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("[onboarding/complete] FATAL: Missing Supabase env vars");
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

    const userId = data.user.id;

    // -------------------------------------------
    // 3. FIND USER'S ORG
    // -------------------------------------------
    const orgRows = await sql`
      SELECT o.id, o.external_uuid, o.onboarding_completed
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC
      LIMIT 1;
    `;

    if (!orgRows || orgRows.length === 0) {
      return res.status(400).json({ ok: false, error: "No organization found" });
    }

    const org = orgRows[0];

    // -------------------------------------------
    // 4. IDEMPOTENT CHECK
    // -------------------------------------------
    if (org.onboarding_completed === true) {
      console.log("[onboarding/complete] Already complete for org:", org.id);
      return res.status(200).json({
        ok: true,
        alreadyComplete: true,
        orgId: org.id,
      });
    }

    // -------------------------------------------
    // 5. MARK ONBOARDING COMPLETE
    // -------------------------------------------
    await sql`
      UPDATE organizations
      SET onboarding_completed = true,
          onboarding_step = 6
      WHERE id = ${org.id};
    `;

    console.log("[onboarding/complete] Marked complete for org:", org.id);

    return res.status(200).json({
      ok: true,
      completed: true,
      orgId: org.id,
    });

  } catch (err) {
    console.error("[onboarding/complete] Error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to complete onboarding",
    });
  }
}
