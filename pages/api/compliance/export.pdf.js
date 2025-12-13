// pages/api/compliance/export.pdf.js
import { sql } from "../../../lib/db";
import { SimpleDocTemplate, Paragraph, Spacer, Table } from "reportlab.platypus";
import { getSampleStyleSheet } from "reportlab.lib.styles";
import { colors } from "reportlab.lib";
import { Readable } from "stream";

export default async function handler(req, res) {
  const { orgId, vendorId, alertId } = req.query;

  if (!orgId) {
    return res.status(400).json({ ok: false, error: "Missing orgId" });
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

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="compliance-evidence-org-${orgId}.pdf"`
  );

  const doc = new SimpleDocTemplate(res, {
    pagesize: [612, 792], // US Letter
    rightMargin: 36,
    leftMargin: 36,
    topMargin: 36,
    bottomMargin: 36,
  });

  const styles = getSampleStyleSheet();
  const elements = [];

  // Title
  elements.push(
    new Paragraph(
      `<b>Compliance Evidence Report</b><br/>Org ID: ${orgId}<br/>Generated: ${new Date().toLocaleString()}`,
      styles.Title
    )
  );

  elements.push(new Spacer(1, 12));

  if (rows.length === 0) {
    elements.push(
      new Paragraph("No compliance events recorded.", styles.Normal)
    );
  } else {
    const tableData = [
      [
        "Timestamp",
        "Event",
        "Source",
        "Vendor ID",
        "Alert ID",
      ],
    ];

    for (const r of rows) {
      tableData.push([
        new Date(r.occurred_at).toLocaleString(),
        r.event_type.replace(/_/g, " "),
        r.source,
        r.vendor_id || "",
        r.alert_id || "",
      ]);
    }

    const table = new Table(tableData, {
      repeatRows: 1,
      colWidths: [120, 120, 80, 80, 80],
    });

    table.setStyle([
      ["BACKGROUND", [0, 0], [-1, 0], colors.lightgrey],
      ["GRID", [0, 0], [-1, -1], 0.5, colors.grey],
      ["FONT", [0, 0], [-1, 0], "Helvetica-Bold"],
      ["FONT", [0, 1], [-1, -1], "Helvetica"],
      ["ALIGN", [0, 0], [-1, -1], "LEFT"],
      ["VALIGN", [0, 0], [-1, -1], "MIDDLE"],
    ]);

    elements.push(table);
  }

  doc.build(elements);
}
