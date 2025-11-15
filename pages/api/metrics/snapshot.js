// pages/api/metrics/snapshot.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  let client;
  try {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    // Fetch current policy statuses
    const result = await client.query(`
      SELECT
        SUM( CASE WHEN status = 'expired' THEN 1 ELSE 0 END ) AS expired_count,
        SUM( CASE WHEN status = 'critical' THEN 1 ELSE 0 END ) AS critical_count,
        SUM( CASE WHEN status = 'warning' THEN 1 ELSE 0 END ) AS warning_count,
        SUM( CASE WHEN status = 'ok' THEN 1 ELSE 0 END ) AS ok_count
      FROM policies;
    `);

    const row = result.rows[0];

    // Compute simple score (0–100)
    const total = 
      Number(row.expired_count) +
      Number(row.critical_count) +
      Number(row.warning_count) +
      Number(row.ok_count);

    const score = total === 0
      ? 0
      : Math.round(
          (Number(row.ok_count) / total) * 100 -
            Number(row.expired_count) * 5 -
            Number(row.critical_count) * 2
        );

    // Save snapshot
    await client.query(
      `INSERT INTO dashboard_metrics
       (expired_count, critical_count, warning_count, ok_count, avg_score)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        row.expired_count,
        row.critical_count,
        row.warning_count,
        row.ok_count,
        score
      ]
    );

    await client.end();

    return res.status(200).json({
      ok: true,
      snapshot: {
        expired: row.expired_count,
        critical: row.critical_count,
        warning: row.warning_count,
        ok: row.ok_count,
        score,
      },
    });
  } catch (err) {
    console.error("METRICS SNAPSHOT ERROR:", err);
    if (client) {
      try { await client.end(); } catch {}
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
