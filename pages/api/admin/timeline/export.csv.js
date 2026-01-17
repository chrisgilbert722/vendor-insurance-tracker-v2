// pages/api/admin/timeline/export.csv.js
// Compliance timeline CSV export for audit purposes

import { sql } from "../../../../lib/db";

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
    const orgId = Number(req.query.orgId);

    // HARD GUARD — return empty CSV if no valid orgId
    if (!Number.isInteger(orgId) || orgId <= 0) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=compliance_timeline.csv");
      return res.status(200).send("timestamp,event_type,severity,vendor_name,message\nNo data - invalid organization\n");
    }

    // Query vendor_timeline joined with vendors for complete audit export
    const rows = await sql`
      SELECT
        t.created_at,
        t.action,
        t.severity,
        t.message,
        t.vendor_id,
        v.name AS vendor_name
      FROM vendor_timeline t
      LEFT JOIN vendors v ON v.id = t.vendor_id
      WHERE v.org_id = ${orgId}
      ORDER BY t.created_at DESC;
    `;

    const header = [
      "timestamp",
      "event_type",
      "severity",
      "vendor_name",
      "vendor_id",
      "message",
    ];

    const lines = [
      header.join(","),
      ...(rows || []).map((r) =>
        [
          r.created_at ? new Date(r.created_at).toISOString() : "",
          r.action,
          r.severity,
          r.vendor_name,
          r.vendor_id,
          r.message,
        ]
          .map(csvEscape)
          .join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=compliance_timeline_${new Date().toISOString().split("T")[0]}.csv`
    );

    return res.status(200).send(lines.join("\n"));
  } catch (err) {
    console.error("[timeline/export.csv] error:", err);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=compliance_timeline_error.csv");
    return res.status(200).send("timestamp,event_type,severity,vendor_name,message\nExport failed - please try again\n");
  }
}

