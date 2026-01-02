// pages/api/orgs/for-user.js
// ============================================================
// ORGS FOR USER — COOKIE AUTH (UUID SAFE)
// - Uses Supabase cookie session
// - No Authorization headers
// - No service role auth for identity
// - Canonical source for OrgContext
// ============================================================

import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // 🔐 COOKIE-BASED AUTH (SOURCE OF TRUTH)
    const supabase = supabaseServer(req, res);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        ok: false,
        error: "Unauthenticated",
      });
    }

    const userId = user.id;

    // 🔑 ORGS OWNED / MEMBER OF USER
    const rows = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC
    `;

    return res.status(200).json({
      ok: true,
      orgs: rows,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to load organizations",
    });
  }
}
