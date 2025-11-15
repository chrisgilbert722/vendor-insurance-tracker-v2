// pages/api/metrics/summary.js
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
       LIMIT 2`
    );

    const latest = result.rows[0] || null;
    const previous = result.rows[1] || null;

    const deltas = {
      expired: 0,
      critical: 0,
      warning: 0,
      ok: 0,
      avg_score: 0,
    };

    if (latest && previous) {
      deltas.expired = latest.expired_count - previous.expired_count;
      deltas.critical = latest.critical_count - previous.critical_count;
      deltas.warning = latest.warning_count - previous.warning_count;
      deltas.ok = latest.ok_count - previous.ok_count;
      deltas.avg_score =
        (latest.avg_score || 0) - (previous.avg_score || 0);
    }

    await client.end();

    return res.status(200).json({
      ok: true,
      latest,
      previous,
      deltas,
    });
  } catch (err) {
    console.error("METRICS SUMMARY ERROR:", err);
    if (client) {
      try { await client.end(); } catch {}
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
