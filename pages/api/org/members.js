// pages/api/org/members.js

import { Client } from "pg";

/**
 * GET /api/org/members?orgId=123
 * Returns list of members for an organization.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  const { orgId } = req.query || {};
  const idNum = parseInt(orgId, 10);
  if (!idNum || Number.isNaN(idNum)) {
    return res
      .status(400)
      .json({ ok: false, error: "Valid orgId is required." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT m.id, m.user_id, m.role, m.created_at,
              u.email
       FROM public.organization_members m
       LEFT JOIN auth.users u ON u.id::text = m.user_id
       WHERE m.org_id = $1
       ORDER BY m.created_at ASC`,
      [idNum]
    );

    return res.status(200).json({
      ok: true,
      members: result.rows,
    });
  } catch (err) {
    console.error("org/members error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to load members." });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
