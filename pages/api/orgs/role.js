// pages/api/orgs/role.js
import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";
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
      return res.status(200).json({ ok: true, role: "viewer" });
    }

    const supabase = supabaseServer();

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return res.status(200).json({ ok: true, role: "viewer" });
    }

    const userId = data.user.id;
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    const rows = await sql`
      SELECT role
      FROM org_members
      WHERE org_id = ${orgId}
        AND user_id = ${userId}
      LIMIT 1;
    `;

    return res.status(200).json({
      ok: true,
      role: rows[0]?.role || "viewer",
    });
  } catch (err) {
    console.error("[orgs/role] fail-soft:", err);
    return res.status(200).json({ ok: true, role: "viewer" });
  }
}
