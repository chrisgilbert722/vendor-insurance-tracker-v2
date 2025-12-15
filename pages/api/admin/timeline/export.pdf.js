// pages/api/admin/timeline/export.pdf.js
// UUID-safe, skip-safe compliance timeline PDF export

import PDFDocument from "pdfkit";
import { sql } from "../../../../lib/db";
import { cleanUUID } from "../../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("GET only");
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD GUARD — never crash UI
    if (!orgId) {
      res.setHeader("Content-Type", "application/pdf");
      const doc = new PDFDocument({ margin: 50 });
      doc.text("No data available.");
      doc.pipe(res);
      doc.end();
      return;
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

    // Setup PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=compliance_timeline.pdf"
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Title
    doc
      .fontSize(20)
      .text("Compliance Timeline", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor("gray")
      .text(`Generated: ${new Date().toLocaleString()}`, {
        align: "center",
      })
      .moveDown(1);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    if (!rows || rows.length === 0) {
      doc
        .fontSize(12)
        .fillColor("black")
        .text("No compliance events found.");
      doc.end();
      return;
    }

    // Table headers
    doc
      .fontSize(11)
      .fillColor("black")
      .text("Date", 50, doc.y, { continued: true })
      .text("Event", 150, doc.y, { continued: true })
      .text("Source", 300, doc.y, { continued: true })
      .text("Vendor", 400, doc.y)
      .moveDown(0.5);

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Rows
    for (const r of rows) {
      const y = doc.y;

      doc
        .fontSize(10)
        .text(
          new Date(r.occurred_at).toLocaleDateString(),
          50,
          y,
          { continued: true }
        )
        .text(r.event_type || "-", 150, y, { continued: true })
        .text(r.source || "-", 300, y, { continued: true })
        .text(r.vendor_id || "-", 400, y);

      doc.moveDown(0.3);

      // Auto page break
      if (doc.y > 700) {
        doc.addPage();
      }
    }

    doc.end();
  } catch (err) {
    console.error("[timeline/export.pdf] swallowed error:", err);

    res.setHeader("Content-Type", "application/pdf");
    const doc = new PDFDocument({ margin: 50 });
    doc.text("No data available.");
    doc.pipe(res);
    doc.end();
  }
}

