// pages/api/orgs/for-user.js
import { sql } from "../../../lib/db";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  try {
    const supabase = createServerSupabaseClient({ req, res });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const rows = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${user.id}
      ORDER BY o.id ASC;
    `;

    return res.status(200).json({
      ok: true,
      orgs: rows,
    });
  } catch (err) {
    console.error("[orgs/for-user]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
