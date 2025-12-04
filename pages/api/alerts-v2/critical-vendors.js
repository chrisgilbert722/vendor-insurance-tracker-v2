// pages/api/alerts-v2/critical-vendors.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId, limit = 5 } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const rows = await sql`
      SELECT
        v.id AS vendor_id,
        v.name AS vendor_name,
        COUNT(a.id) AS alert_count,
        MAX(a.severity) AS max_severity,
        MAX(a.created_at) AS last_alert_at
      FROM alerts_v2 a
      JOIN vendors v
        ON v.id = a.vendor_id
      WHERE a.org_id = ${orgId}
        AND a.resolved_at IS NULL
      GROUP BY v.id, v.name
      ORDER BY COUNT(a.id) DESC, MAX(a.created_at) DESC
      LIMIT ${limit};
    `;

    const now = new Date();

    const vendors = rows.map((r) => {
      const lastDate = new Date(r.last_alert_at);
      const ageDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      return {
        vendorId: r.vendor_id,
        name: r.vendor_name,
        alertCount: Number(r.alert_count),
        maxSeverity: r.max_severity,
        lastAlertAgeDays: ageDays,
      };
    });

    return res.status(200).json({ ok: true, vendors });
  } catch (err) {
    console.error("[critical-vendors] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
