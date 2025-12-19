// pages/api/orgs/role.js
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 🔐 Resolve user from Supabase session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // 🔒 Resolve org (UUID → internal int)
    const orgId = await resolveOrg(req, res);
    if (!orgId) return; // resolveOrg already responded

    // 🎯 Fetch org-scoped role
    const rows = await sql`
      SELECT role
      FROM org_members
      WHERE org_id = ${orgId}
        AND user_id = ${session.user.id}
      LIMIT 1;
    `;

    const role = rows[0]?.role || "viewer";

    return res.status(200).json({
      ok: true,
      role,
    });
  } catch (err) {
    console.error("[ORG ROLE ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
