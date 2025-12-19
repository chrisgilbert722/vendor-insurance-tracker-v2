// pages/api/orgs/role.js
import { Client } from "pg";

export default async function handler(req, res) {
  const orgId = Number(req.query.orgId);
  if (!orgId) {
    return res.status(400).json({ error: "Invalid orgId" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // 🔐 Get user from Supabase session cookie
    const userId = req.headers["x-user-id"];

    if (!userId) {
      return res.status(401).json({ error: "No user" });
    }

    const r = await client.query(
      `
      SELECT role
      FROM org_members
      WHERE org_id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [orgId, userId]
    );

    return res.status(200).json({
      role: r.rows[0]?.role || "viewer",
    });
  } catch (err) {
    console.error("[orgs/role]", err);
    return res.status(500).json({ error: "Role lookup failed" });
  } finally {
    await client.end();
  }
}
