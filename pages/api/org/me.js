// pages/api/org/me.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId required" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(
      `
      SELECT o.id, o.name, m.role
      FROM public.organizations o
      JOIN public.organization_members m
      ON o.id = m.org_id
      WHERE m.user_id = $1
      ORDER BY o.created_at ASC
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "No organization found for user",
      });
    }

    return res.status(200).json({
      ok: true,
      org: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        role: result.rows[0].role,
      },
    });
  } catch (err) {
    console.error("org/me error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await client.end();
  }
}
