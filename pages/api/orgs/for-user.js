// pages/api/orgs/for-user.js
import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  try {
    // 🔐 COOKIE-BASED AUTH (THE ONLY VALID WAY)
    const supabase = supabaseServer(req, res);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        ok: false,
        error: "Not authenticated",
      });
    }

    const userId = user.id;

    // 🔑 AUTHORITATIVE ORG LOOKUP
    const orgs = await sql`
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
      orgs,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
