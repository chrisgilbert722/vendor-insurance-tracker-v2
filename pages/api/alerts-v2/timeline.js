// pages/api/alerts-v2/timeline.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId, days = 30, includeResolved } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const daysNum = Math.min(
      Math.max(Number(days) || 30, 1),
      365
    );

    const allowResolved =
      String(includeResolved || "").toLowerCase() === "true" ||
      String(includeResolved || "") === "1";

    const rows = await sql`
      SELECT 
        DATE(created_at) AS day,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(severity,'')) = 'critical')::int AS critical,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(severity,'')) = 'high')::int AS high,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(severity,'')) = 'medium')::int AS medium,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(severity,'')) = 'low')::int AS low
      FROM alerts_v2
      WHERE org_id = ${Number(orgId)}
        AND created_at >= NOW() - (${daysNum} || ' days')::interval
        AND (${allowResolved}::boolean = true OR resolved_at IS NULL)
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
    console.error("[alerts-v2/timeline] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
