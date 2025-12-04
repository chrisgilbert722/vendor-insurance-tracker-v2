// pages/api/alerts/vendor-v3.js
// Vendor-level Alerts V3 — returns all alerts for a single vendor

import { sql } from "../../../lib/db";

/*
  GET /api/alerts/vendor-v3?vendorId=...&orgId=...

  Response:
  {
    ok: true,
    vendorId,
    orgId,
    alerts: [
      {
        code,
        message,
        severity,
        createdAt
      }
    ]
  }
*/

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  try {
    const { vendorId, orgId } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId in query.",
      });
    }

    // Optionally filter by orgId if provided
    const alerts = orgId
      ? await sql`
          SELECT vendor_id, org_id, code, message, severity, created_at
          FROM vendor_alerts
          WHERE vendor_id = ${vendorId}
          AND org_id = ${orgId}
          ORDER BY created_at DESC;
        `
      : await sql`
          SELECT vendor_id, org_id, code, message, severity, created_at
          FROM vendor_alerts
          WHERE vendor_id = ${vendorId}
          ORDER BY created_at DESC;
        `;

    const normalized = alerts.map((a) => ({
      vendorId: a.vendor_id,
      orgId: a.org_id,
      code: a.code,
      message: a.message,
      severity: normalizeSeverity(a.severity),
      createdAt: a.created_at || null,
    }));

    return res.status(200).json({
      ok: true,
      vendorId,
      orgId: orgId || null,
      alerts: normalized,
    });
  } catch (err) {
    console.error("[alerts/vendor-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load vendor alerts.",
    });
  }
}

function normalizeSeverity(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  if (s === "low") return "low";
  return "unknown";
}
