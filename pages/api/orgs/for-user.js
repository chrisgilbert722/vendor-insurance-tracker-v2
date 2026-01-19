// pages/api/orgs/for-user.js
// ============================================================
// GET USER'S ORGANIZATIONS — Returns all orgs for authenticated user
// Supports both cookie-based auth AND Bearer token auth
// ============================================================

import { sql } from "../../../lib/db";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(200).json({
      ok: true,
      orgs: [],
      hasOrg: false,
      error: "Method not allowed",
    });
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

    // No auth found - return empty but valid response
    if (!user) {
      return res.status(200).json({
        ok: true,
        orgs: [],
        hasOrg: false,
        authenticated: false,
      });
    }

    const userId = user.id;

    const orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid,
        o.onboarding_step,
        o.onboarding_completed
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC;
    `;

    return res.status(200).json({
      ok: true,
      orgs: orgs || [],
      hasOrg: orgs && orgs.length > 0,
      authenticated: true,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(200).json({
      ok: true,
      orgs: [],
      hasOrg: false,
      error: err.message,
    });
  }
}
