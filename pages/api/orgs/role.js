// pages/api/orgs/role.js
import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";
import { createClient } from "@supabase/supabase-js";

// 🔐 Server-side Supabase client (service role)
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only GET is supported
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // =========================================================
    // 🔐 Extract Bearer token (FAIL-SOFT)
    // =========================================================
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    // 🚫 No token → viewer (NO 401s, NO errors)
    if (!token) {
      return res.status(200).json({
        ok: true,
        role: "viewer",
      });
    }

    // =========================================================
    // 🔐 Validate user via Supabase (FAIL-SOFT)
    // =========================================================
    const { data, error } = await supabaseServer.auth.getUser(token);

    if (error || !data?.user?.id) {
      return res.status(200).json({
        ok: true,
        role: "viewer",
      });
    }

    const userId = data.user.id;

    // =========================================================
    // 🔒 Resolve org (UUID → INT)
    // =========================================================
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      // resolveOrg already handled response
      return;
    }

    // =========================================================
    // 🎯 Fetch org-scoped role (FAIL-SOFT)
    // =========================================================
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
    console.error("[orgs/role] fail-soft:", err?.message || err);

    // 🔇 ABSOLUTE GUARANTEE: never break UI
    return res.status(200).json({
      ok: true,
      role: "viewer",
    });
  }
}
