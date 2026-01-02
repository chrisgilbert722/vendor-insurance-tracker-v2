// pages/api/orgs/for-user.js
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ ok: false, error: "No auth token" });
    }

    // 1️⃣ Get authenticated Supabase user (UUID)
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const authUserId = data.user.id; // UUID

    // 2️⃣ Resolve app-level user (INT id)
    const userRows = await sql`
      SELECT id
      FROM users
      WHERE auth_user_id = ${authUserId}
      LIMIT 1;
    `;

    if (userRows.length === 0) {
      return res.status(200).json({
        ok: true,
        orgs: [],
      });
    }

    const userId = userRows[0].id; // INT

    // 3️⃣ Fetch organizations for THIS user only
    const orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC;
    `;

    return res.status(200).json({ ok: true, orgs });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
