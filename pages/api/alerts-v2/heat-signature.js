// pages/api/alerts-v2/heat-signature.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId, days = 30 } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const rows = await sql`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS total
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND created_at >= NOW() - INTERVAL '${days} days'
        AND resolved_at IS NULL
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC;
    `;

    const data = rows.map((r) => ({
      day: r.day.toISOString().split("T")[0],
      count: Number(r.total),
    }));

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("[heat-signature] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
