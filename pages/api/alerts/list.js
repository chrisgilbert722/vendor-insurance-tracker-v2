// pages/api/alerts/list.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { orgId } = req.query;
  const numericOrgId = orgId ? Number(orgId) : null;

  const connectionString =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const alertsResult = await client.query(
      `
      SELECT
        a.id,
        a.created_at,
        a.is_read,
        a.org_id,
        a.vendor_id,
        a.type,
        a.message,
        v.name AS vendor_name
      FROM alerts a
      LEFT JOIN vendors v ON v.id = a.vendor_id
      WHERE ($1::int IS NULL OR a.org_id = $1::int)
      ORDER BY a.created_at DESC
      LIMIT 200;
      `,
      [numericOrgId]
    );

    return res.status(200).json({
      ok: true,
      alerts: alertsResult.rows,
    });
  } catch (err) {
    console.error("alerts/list error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
