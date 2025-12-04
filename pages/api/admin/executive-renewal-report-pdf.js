// pages/api/admin/executive-renewal-report-pdf.js
// Executive Renewal Prediction PDF Export (Org-Level)

import PDFDocument from "pdfkit";
import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: true, // JSON body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId } = req.body || {};
    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId in body" });
    }

    // Load predictions for this org
    const preds = await sql`
      SELECT 
        rp.vendor_id, 
        rp.org_id,
        rp.risk_score,
        rp.risk_tier,
        rp.likelihood_on_time,
        rp.likelihood_late,
        rp.likelihood_fail,
        v.name as vendor_name
      FROM renewal_predictions rp
      JOIN vendors v ON v.id = rp.vendor_id
      WHERE rp.org_id = ${orgId}
      ORDER BY rp.risk_score DESC;
    `;

    const predictions = preds || [];
    const totalVendors = predictions.length;
    const avgRisk =
      totalVendors > 0
        ? Math.round(
            predictions.reduce((sum, p) => sum + (p.risk_score || 0), 0) /
              totalVendors
          )
        : null;

    const tierCounts = {
      severe: 0,
      "high risk": 0,
      watch: 0,
      preferred: 0,
      "elite safe": 0,
      unknown: 0,
    };
    predictions.forEach((p) => {
      const t = (p.risk_tier || "").toLowerCase();
      if (tierCounts[t] !== undefined) tierCounts[t]++;
      else tierCounts.unknown++;
    });

    const predictedFailures = predictions
      .filter((p) => (p.likelihood_fail || 0) >= 40)
      .sort((a, b) => b.likelihood_fail - a.likelihood_fail);

    // Start PDF
    const doc = new PDFDocument({ margin: 40 });

    const fileName = `Executive_Renewal_Report_${orgId}_${Date.now()}.pdf`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Title
    doc
      .fontSize(20)
      .fillColor("#111827")
      .text("Executive Renewal Prediction Report", { align: "left" });

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#6b7280")
      .text(`Org ID: ${orgId}`, { align: "left" });
    doc
      .fontSize(10)
      .fillColor("#6b7280")
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "left" });

    doc.moveDown(1);

    // Summary block
    doc
      .fontSize(12)
      .fillColor("#111827")
      .text("Org-Level Summary", { underline: true });

    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(
        totalVendors > 0
          ? `Vendors scored: ${totalVendors}`
          : "No vendors have predictions yet."
      );
    doc
      .fontSize(11)
      .fillColor("#111827")
      .text(`Average renewal risk: ${avgRisk ?? "—"}`);

    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#111827").text("Risk tier breakdown:");
    doc
      .fontSize(10)
      .fillColor("#374151")
      .list(
        [
          `Severe: ${tierCounts.severe}`,
          `High Risk: ${tierCounts["high risk"]}`,
          `Watch: ${tierCounts.watch}`,
          `Preferred: ${tierCounts.preferred}`,
          `Elite Safe: ${tierCounts["elite safe"]}`,
          `Unknown: ${tierCounts.unknown}`,
        ],
        { bulletRadius: 2 }
      );

    doc.moveDown(1);

    // AI-ish narrative
    if (totalVendors > 0) {
      doc
        .fontSize(12)
        .fillColor("#111827")
        .text("AI Org Insight", { underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(11)
        .fillColor("#111827")
        .text(
          `This organization currently has ${totalVendors} vendors scored with an average renewal risk of ${
            avgRisk ?? "—"
          }. ${tierCounts.severe} vendors are in Severe risk and ${
            tierCounts["high risk"]
          } in High Risk, indicating where renewal interventions and broker follow-up should be focused in the next 30–60 days.`,
          { align: "left" }
        );
      doc.moveDown(1);
    }

    // High-risk vendors table
    const highRiskVendors = predictions
      .filter((p) => {
        const t = (p.risk_tier || "").toLowerCase();
        return t === "severe" || t === "high risk";
      })
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 15);

    doc
      .fontSize(12)
      .fillColor("#111827")
      .text("Top High-Risk Vendors", { underline: true });
    doc.moveDown(0.5);

    if (!highRiskVendors.length) {
      doc
        .fontSize(11)
        .fillColor("#374151")
        .text("No vendors currently in Severe or High Risk tiers.");
    } else {
      doc.fontSize(10).fillColor("#111827");
      doc.text("Vendor                 Tier            Risk    Fail%   On-Time%");
      doc.moveTo(doc.x, doc.y + 2).lineTo(550, doc.y + 2).stroke("#e5e7eb");
      doc.moveDown(0.4);

      highRiskVendors.forEach((v) => {
        const line = [
          (v.vendor_name || "").slice(0, 22).padEnd(22, " "),
          (v.risk_tier || "").padEnd(14, " "),
          String(v.risk_score || "—").padEnd(7, " "),
          `${v.likelihood_fail ?? "—"}%`.padEnd(8, " "),
          `${v.likelihood_on_time ?? "—"}%`,
        ].join("  ");

        doc.text(line);
      });
    }

    doc.addPage();

    // Predicted failures block
    doc
      .fontSize(12)
      .fillColor("#111827")
      .text("Vendors Likely to Fail Renewal", { underline: true });
    doc.moveDown(0.5);

    if (!predictedFailures.length) {
      doc
        .fontSize(11)
        .fillColor("#374151")
        .text(
          "No vendors currently predicted at 40% or higher likelihood of renewal failure."
        );
    } else {
      doc.fontSize(10).fillColor("#111827");
      doc.text("Vendor                 Risk    Fail%   On-Time%");
      doc.moveTo(doc.x, doc.y + 2).lineTo(550, doc.y + 2).stroke("#e5e7eb");
      doc.moveDown(0.4);

      predictedFailures.slice(0, 20).forEach((v) => {
        const line = [
          (v.vendor_name || "").slice(0, 22).padEnd(22, " "),
          String(v.risk_score || "—").padEnd(7, " "),
          `${v.likelihood_fail ?? "—"}%`.padEnd(8, " "),
          `${v.likelihood_on_time ?? "—"}%`,
        ].join("  ");
        doc.text(line);
      });
    }

    doc.end();
  } catch (err) {
    console.error("[executive-renewal-report-pdf] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "PDF generation failed" });
  }
}
