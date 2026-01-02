// pages/api/orgs/for-user.js
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

export default async function handler(req, res) {
  try {
    // 🔒 COOKIE-BASED AUTH (NO HEADERS)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(req.headers.authorization?.replace("Bearer ", ""));

    // Fallback: read session from cookies (PRIMARY PATH)
    const cookieUser =
      req.cookies?.["sb-access-token"]
        ? await supabase.auth.getUser(req.cookies["sb-access-token"])
        : null;

    const authUser = user || cookieUser?.data?.user;

    if (!authUser) {
      return res.status(401).json({
        ok: false,
        error: "Not authenticated",
      });
    }

    const userId = authUser.id;

    // 🔑 AUTHORITATIVE ORG LOOKUP
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
      error: err.message,
    });
  }
}
