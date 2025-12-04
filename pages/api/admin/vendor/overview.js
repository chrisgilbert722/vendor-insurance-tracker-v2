// pages/api/admin/vendor/overview.js
import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { id } = req.query;
    const vendorId = id ? parseInt(id, 10) : null;

    if (!vendorId || Number.isNaN(vendorId)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid vendor id." });
    }

    /* ----------------------------------------------------------
       1) Vendor
    ---------------------------------------------------------- */
    const vendorRows = await sql`
      SELECT id, name
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;

    if (!vendorRows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found." });
    }

    const vendor = vendorRows[0];

    /* ----------------------------------------------------------
       2) Portal token + org
    ---------------------------------------------------------- */
    const portalRows = await sql`
      SELECT org_id, token
      FROM vendor_portal_tokens
      WHERE vendor_id = ${vendorId}
      LIMIT 1;
    `;

    let org = null;
    let portalToken = null;

    if (portalRows.length) {
      portalToken = portalRows[0].token;
      const orgId = portalRows[0].org_id;

      const orgRows = await sql`
        SELECT id, name
        FROM orgs
        WHERE id = ${orgId}
        LIMIT 1;
      `;

      if (orgRows.length) {
        org = orgRows[0];
      }
    }

    /* ----------------------------------------------------------
       3) Alerts
    ---------------------------------------------------------- */
    const alertRows = await sql`
      SELECT code, label, message, severity
      FROM vendor_alerts
      WHERE vendor_id = ${vendorId}
      ORDER BY severity DESC, code ASC;
    `;

    /* ----------------------------------------------------------
       4) Requirements
    ---------------------------------------------------------- */
    let requirementRows = [];

    if (org) {
      requirementRows = await sql`
        SELECT name, limit
        FROM coverage_requirements
        WHERE org_id = ${org.id}
        ORDER BY name ASC;
      `;
    }

    /* ----------------------------------------------------------
       5) Timeline
    ---------------------------------------------------------- */
    const timelineRows = await sql`
      SELECT action, message, severity, created_at
      FROM vendor_timeline
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    /* ----------------------------------------------------------
       6) NEW: Documents (W9, License, Contract, Other)
    ---------------------------------------------------------- */
    const documentRows = await sql`
      SELECT id, doc_type, filename, mimetype, created_at
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC;
    `;

    /* ----------------------------------------------------------
       7) Derived metrics
    ---------------------------------------------------------- */
    const metrics = {
      totalAlerts: alertRows.length,
      criticalAlerts: alertRows.filter(
        (a) => a.severity === "critical"
      ).length,
      highAlerts: alertRows.filter((a) => a.severity === "high").length,
      infoAlerts: alertRows.filter((a) => a.severity === "info").length,
      coverageCount: requirementRows.length,
      lastActivity: timelineRows[0]?.created_at || null,
    };

    /* ----------------------------------------------------------
       RETURN
    ---------------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      vendor,
      org,
      portalToken,
      alerts: alertRows,
      requirements: requirementRows,
      timeline: timelineRows,
      metrics,

      // 🔥 NEW:
      documents: documentRows,
    });
  } catch (err) {
    console.error("[admin/vendor/overview] ERROR", err);
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
}
