// pages/api/orgs/for-user.js
// ============================================================
// GET USER'S ORGANIZATIONS — Returns all orgs for authenticated user
// Uses Bearer token auth (token from Authorization header)
// ============================================================

import { sql } from "../../../lib/db";
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
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(200).json({
        ok: true,
        orgs: [],
        hasOrg: false,
        authenticated: false,
      });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return res.status(200).json({
        ok: true,
        orgs: [],
        hasOrg: false,
        authenticated: false,
      });
    }

    // Verify token with Supabase admin client
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("[orgs/for-user] Missing Supabase env vars");
      return res.status(200).json({
        ok: true,
        orgs: [],
        hasOrg: false,
        error: "Server config error",
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !data?.user) {
      return res.status(200).json({
        ok: true,
        orgs: [],
        hasOrg: false,
        authenticated: false,
      });
    }

    const userId = data.user.id;

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
