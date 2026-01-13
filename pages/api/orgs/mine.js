// pages/api/orgs/mine.js
import { sql } from "@db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  try {
    // 🔐 Read auth token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ ok: false });
    }

    // 🔐 Validate user via Supabase (service role)
    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.getUser(token);

    const user = data?.user;
    if (error || !user?.id) {
      return res.status(401).json({ ok: false });
    }

    // 🧠 Query Neon for orgs (NO pg Client, NO createClient)
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
      orgs: rows || [],
    });
  } catch (err) {
    console.error("[orgs/mine] error:", err);
    return res.status(500).json({ ok: false });
  }
}
