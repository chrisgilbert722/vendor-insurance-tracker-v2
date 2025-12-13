// pages/api/compliance/events.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  const { orgId, vendorId, alertId, limit = 50 } = req.query;
  if (!orgId) {
    return res.status(400).json({ ok: false, error: "Missing orgId" });
  }

  const rows = await sql`
    SELECT *
    FROM compliance_events
    WHERE org_id = ${Number(orgId)}
      AND (${vendorId ? sql`vendor_id = ${Number(vendorId)}` : sql`TRUE`})
      AND (${alertId ? sql`alert_id = ${Number(alertId)}` : sql`TRUE`})
    ORDER BY occurred_at DESC
    LIMIT ${Number(limit)};
  `;

  res.json({ ok: true, events: rows });
}
