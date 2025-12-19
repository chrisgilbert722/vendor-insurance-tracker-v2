// pages/api/orgs/mine.js
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // 1️⃣ Get Supabase user from session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ ok: false });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);

    const user = userData?.user;
    if (!user) {
      return res.status(401).json({ ok: false });
    }

    // 2️⃣ Query Neon for orgs
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    const result = await client.query(
      `
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = $1
      `,
      [user.id]
    );

    await client.end();

    return res.json({
      ok: true,
      orgs: result.rows,
    });
  } catch (err) {
    console.error("orgs/mine error:", err);
    return res.status(500).json({ ok: false });
  }
}
