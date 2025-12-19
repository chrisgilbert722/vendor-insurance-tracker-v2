// pages/api/orgs/role.js
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const rawOrgId = req.query.orgId;
  const orgId = Number(rawOrgId);

  // 🚫 Invalid org → safe viewer
  if (!Number.isInteger(orgId)) {
    return res.status(200).json({ ok: true, role: "viewer" });
  }

  try {
    // 🔐 Supabase auth (server-side)
    const supabase = createServerSupabaseClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 🚫 No session → viewer (NO 401)
    if (!session?.user?.id) {
      return res.status(200).json({ ok: true, role: "viewer" });
    }

    const userId = session.user.id;

    // 🔎 Org-scoped role lookup
    const rows = await sql`
      SELECT role
      FROM org_members
      WHERE org_id = ${orgId}
        AND user_id = ${userId}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return res.status(200).json({ ok: true, role: "viewer" });
    }

    return res.status(200).json({
      ok: true,
      role: rows[0].role || "viewer",
    });
  } catch (err) {
    console.error("[orgs/role] error:", err);
    // 🔥 Never break UI permissions
    return res.status(200).json({ ok: true, role: "viewer" });
  }
}
