// pages/api/orgs/role.js
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";
import { createClient } from "@supabase/supabase-js";

const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 🔐 Extract Bearer token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      // 🚫 No token → viewer (NO 401 SPAM)
      return res.status(200).json({ ok: true, role: "viewer" });
    }

    // 🔐 Validate user
    const { data, error } = await supabaseServer.auth.getUser(token);

    if (error || !data?.user?.id) {
      return res.status(200).json({ ok: true, role: "viewer" });
    }

    const userId = data.user.id;

    // 🔒 Resolve org (external UUID → internal int)
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // 🎯 Fetch org-scoped role
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
    console.error("[ORG ROLE ERROR]", err);
    // 🔇 Never spam 500s for role checks
    return res.status(200).json({ ok: true, role: "viewer" });
  }
}
