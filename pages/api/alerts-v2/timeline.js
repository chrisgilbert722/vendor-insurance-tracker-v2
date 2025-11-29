// pages/api/alerts-v2/timeline.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId, days = 30 } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // Pull daily alert counts for last X days
    const rows = await sql`
      SELECT 
        DATE(created_at) AS day,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'high') AS high,
        COUNT(*) FILTER (WHERE severity = 'medium') AS medium,
        COUNT(*) FILTER (WHERE severity = 'low') AS low
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND created_at >= NOW() - INTERVAL '${days} days'
        AND resolved_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC;
    `;

    const timeline = rows.map((r) => ({
      date: r.day.toISOString().split("T")[0],
      total: Number(r.total),
      critical: Number(r.critical),
      high: Number(r.high),
      medium: Number(r.medium),
      low: Number(r.low),
    }));

    return res.status(200).json({ ok: true, timeline });
  } catch (err) {
    console.error("[timeline] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
