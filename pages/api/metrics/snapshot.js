// pages/api/metrics/snapshot.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let client;
  try {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const result = await client.query(
      `SELECT snapshot_date, expired_count, critical_count, warning_count, ok_count, avg_score
       FROM dashboard_metrics
       ORDER BY snapshot_date DESC
       LIMIT 1`
    );

    const latest = result.rows[0] || null;

    await client.end();

    return res.status(200).json({
      ok: true,
      latest
    });
  } catch (err) {
    console.error("METRICS SNAPSHOT ERROR:", err);
    if (client) {
      try { await client.end(); } catch {}
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
