// pages/api/orgs/for-user.js

import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
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

    const supabase = supabaseServer();

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({
        ok: false,
        error: "Invalid session",
      });
    }

    const userId = data.user.id;

    const orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid,
        o.onboarding_step
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC;
    `;

    return res.status(200).json({
      ok: true,
      orgs: orgs || [],
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
