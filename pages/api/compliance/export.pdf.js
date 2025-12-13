// pages/api/compliance/export.pdf.js
import PDFDocument from "pdfkit";
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  const { orgId, vendorId, alertId } = req.query;

  // Hard guard — prevents orgId=null crashes
  if (!orgId || orgId === "null" || orgId === "undefined") {
    return res.status(400).json({ ok: false, error: "Missing orgId" });
  }

  const rows = await sql`
    SELECT
      occurred_at,
      event_type,
      source,
      vendor_id,
      alert_id
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

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 40, left: 40, right: 40, bottom: 40 },
  });

  doc.pipe(res);

  // ===== HEADER =====
  doc
    .fontSize(18)
    .text("Compliance Evidence Report", { align: "center" });

  doc
    .moveDown(0.5)
    .fontSize(10)
    .fillColor("gray")
    .text(`Organization ID: ${orgId}`)
    .text(`Generated: ${new Date().toLocaleString()}`)
    .moveDown()
    .fillColor("black");

  if (!rows.length) {
    doc.fontSize(12).text("No compliance events recorded.");
  } else {
    doc.fontSize(11);

    for (const r of rows) {
      doc
        .moveDown(0.4)
        .text(`Event: ${String(r.event_type || "").replace(/_/g, " ")}`)
        .fontSize(9)
        .fillColor("gray")
        .text(`Time: ${new Date(r.occurred_at).toLocaleString()}`)
        .text(`Source: ${r.source}`)
        .text(`Vendor ID: ${r.vendor_id || "—"}`)
        .text(`Alert ID: ${r.alert_id || "—"}`)
        .fillColor("black");

      doc
        .moveDown(0.25)
        .moveTo(40, doc.y)
        .lineTo(572, doc.y)
        .strokeColor("#cccccc")
        .stroke();
    }
  }

  doc.end();
}
