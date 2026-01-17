// pages/api/orgs/for-user.js

import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing auth token",
      });
    }

    // ✅ CORRECT: create server-side Supabase client
    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        ok: false,
        error: "Invalid session",
      });
    }

    const userId = data.user.id;
    const email = data.user.email;

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

    // NO AUTO-CREATE: Return empty array if user has no orgs
    // User must explicitly create an org via onboarding
    return res.status(200).json({
      ok: true,
      orgs: orgs || [],
      hasOrg: orgs && orgs.length > 0,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
