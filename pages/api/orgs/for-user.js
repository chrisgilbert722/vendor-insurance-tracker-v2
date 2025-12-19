// pages/api/orgs/for-user.js
import { sql } from "../../../lib/db";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ ok: false, error: "No auth token" });
    }

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);

    if (authErr || !user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${user.id}
      ORDER BY o.id ASC;
    `;

    return res.status(200).json({ ok: true, orgs });
  } catch (err) {
    console.error("[orgs/for-user]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
