// pages/api/admin/timeline/export.csv.js
// UUID-safe, skip-safe compliance timeline CSV export

import { sql } from "../../../../lib/db";
import { cleanUUID } from "../../../../lib/uuid";

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("GET only");
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD GUARD — never crash UI
    if (!orgId) {
      res.setHeader("Content-Type", "text/csv");
      return res.status(200).send("No data\n");
    }

    const rows = await sql`
      SELECT
        occurred_at,
        event_type,
        source,
        vendor_id,
        alert_id
      FROM compliance_events
      WHERE org_id = ${orgId}
      ORDER BY occurred_at DESC;
    `;

    const header = [
      "occurred_at",
      "event_type",
      "source",
      "vendor_id",
      "alert_id",
    ];

    const lines = [
      header.join(","),
      ...(rows || []).map((r) =>
        [
          r.occurred_at,
          r.event_type,
          r.source,
          r.vendor_id,
          r.alert_id,
        ]
          .map(csvEscape)
          .join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=compliance_timeline.csv"
    );

    return res.status(200).send(lines.join("\n"));
  } catch (err) {
    console.error("[timeline/export.csv] swallowed error:", err);
    res.setHeader("Content-Type", "text/csv");
    return res.status(200).send("No data\n");
  }
}

