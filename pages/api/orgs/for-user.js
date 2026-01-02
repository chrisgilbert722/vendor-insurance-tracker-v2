// pages/api/orgs/for-user.js
import { supabaseServer } from "../../../lib/supabaseServer";
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    // ✅ Cookie-based auth (NO bearer tokens)
    const supabase = supabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    // 🔑 THIS is the correct user id (matches organization_members.user_id)
    const authUserId = user.id;

    const rows = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${authUserId}
      ORDER BY o.id ASC
    `;

    return res.status(200).json({
      ok: true,
      orgs: rows,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
