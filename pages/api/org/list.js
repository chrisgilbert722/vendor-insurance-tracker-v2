// pages/api/org/list.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT o.id, o.name, o.created_at, m.role
      FROM public.organizations o
      JOIN public.organization_members m
      ON o.id = m.org_id
      WHERE m.user_id = $1
      ORDER BY o.name ASC
      `,
      [userId]
    );

    return res.status(200).json({ ok: true, orgs: result.rows });
  } catch (err) {
    console.error("org/list error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await client.end();
  }
}
