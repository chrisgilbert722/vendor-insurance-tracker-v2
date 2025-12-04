// pages/api/alerts/summary-v3.js
// Alerts V3 — summary view over vendor_alerts (per-org + per-vendor)

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in query.",
      });
    }

    // Pull all alerts for this org (latest first if created_at exists)
    const alerts = await sql`
      SELECT vendor_id, org_id, code, message, severity, created_at
      FROM vendor_alerts
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC;
    `;

    if (!alerts.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        total: 0,
        countsBySeverity: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          unknown: 0,
        },
        vendors: {},
      });
    }

    // Global severity counts
    const countsBySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    // Vendor-level aggregation
    const vendors = {};

    for (const a of alerts) {
      const sev = normalizeSeverity(a.severity);
      countsBySeverity[sev] = (countsBySeverity[sev] || 0) + 1;

      if (!vendors[a.vendor_id]) {
        vendors[a.vendor_id] = {
          vendorId: a.vendor_id,
          orgId: a.org_id,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          unknown: 0,
          latest: null,
        };
      }

      const v = vendors[a.vendor_id];
      v.total += 1;
      v[sev] = (v[sev] || 0) + 1;

      // Because alerts are ordered DESC by created_at,
      // the first time we see a vendor is the latest alert.
      if (!v.latest) {
        v.latest = {
          code: a.code,
          message: a.message,
          severity: sev,
          createdAt: a.created_at || null,
        };
      }
    }

    const total = alerts.length;

    return res.status(200).json({
      ok: true,
      orgId,
      total,
      countsBySeverity,
      vendors,
    });
  } catch (err) {
    console.error("[alerts/summary-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load alert summary.",
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
