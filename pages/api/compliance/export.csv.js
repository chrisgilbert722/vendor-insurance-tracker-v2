// pages/api/compliance/export.csv.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  const { orgId, vendorId, alertId } = req.query;

  if (!orgId) {
    return res.status(400).send("Missing orgId");
  }

  const rows = await sql`
    SELECT
      occurred_at,
      event_type,
      source,
      vendor_id,
      alert_id,
      payload
    FROM compliance_events
    WHERE org_id = ${Number(orgId)}
      AND (${vendorId ? sql`vendor_id = ${Number(vendorId)}` : sql`TRUE`})
      AND (${alertId ? sql`alert_id = ${alertId}` : sql`TRUE`})
    ORDER BY occurred_at ASC;
  `;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="compliance-evidence-org-${orgId}.csv"`
  );

  const header =
    "occurred_at,event_type,source,vendor_id,alert_id,payload\n";
  res.write(header);

  for (const r of rows) {
    res.write(
      `"${r.occurred_at.toISOString()}","${r.event_type}","${r.source}","${r.vendor_id || ""}","${r.alert_id || ""}","${JSON.stringify(
        r.payload || {}
      ).replace(/"/g, '""')}"\n`
    );
  }

  res.end();
}
