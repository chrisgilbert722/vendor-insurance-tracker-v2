// pages/api/dashboard/metrics.js
// Dashboard metrics API — safe, production-ready, shaped for Dashboard V4.

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const orgId =
      req.query.orgId ||
      (req.method === "POST" ? req.body?.orgId : null);

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId for metrics" });
    }

    // ---------------------------
    // 1) Vendor count
    // ---------------------------
    let vendorCount = 0;
    try {
      const rows = await sql`
        SELECT COUNT(*)::int AS vendor_count
        FROM vendors
        WHERE org_id = ${orgId};
      `;
      vendorCount = rows[0]?.vendor_count ?? 0;
    } catch (err) {
      console.error("[metrics] vendorCount error:", err);
    }

    // ---------------------------
    // 2) Alerts (last 90 days)
    // ---------------------------
    let alerts = {
      expired: 0,
      critical30d: 0,
      warning90d: 0,
      eliteFails: 0,
    };

    let severityBreakdown = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    try {
      const alertRows = await sql`
        SELECT severity, type, created_at
        FROM alerts_v2
        WHERE org_id = ${orgId}
          AND created_at >= NOW() - INTERVAL '90 days';
      `;

      const now = new Date();

      for (const a of alertRows) {
        const sev = (a.severity || "").toLowerCase();
        const type = (a.type || "").toLowerCase();
        const createdAt = a.created_at
          ? new Date(a.created_at)
          : new Date();

        const ageDays = Math.floor(
          (now.getTime() - createdAt.getTime()) / 86400000
        );

        // Expired (by type)
        if (type.includes("renew_expired") || type.includes("expired")) {
          alerts.expired++;
        }

        // Critical in last 30 days
        if (sev === "critical" && ageDays <= 30) {
          alerts.critical30d++;
        }

        // Warning in last 90 days
        if ((sev === "warning" || sev === "medium") && ageDays <= 90) {
          alerts.warning90d++;
        }

        // Elite fails
        if (type.includes("elite") && type.includes("fail")) {
          alerts.eliteFails++;
        }

        // Severity breakdown
        if (sev === "critical") severityBreakdown.critical++;
        else if (sev === "high") severityBreakdown.high++;
        else if (sev === "medium" || sev === "warning")
          severityBreakdown.medium++;
        else if (sev === "low") severityBreakdown.low++;
      }
    } catch (err) {
      console.error("[metrics] alerts error:", err);
    }

    // ---------------------------
    // 3) Compute a global score (0–100)
    // ---------------------------
    const penaltyExpired = alerts.expired * 12;
    const penaltyCritical = alerts.critical30d * 6;
    const penaltyWarning = alerts.warning90d * 3;
    const penaltyElite = alerts.eliteFails * 8;

    let globalScore = 100 - (penaltyExpired + penaltyCritical + penaltyWarning + penaltyElite);
    globalScore = Math.max(0, Math.min(100, globalScore));

    // ---------------------------
    // 4) Build overview payload
    // ---------------------------
    const overview = {
      globalScore,
      vendorCount,
      alerts,
      severityBreakdown,
    };

    return res.status(200).json({ ok: true, overview });
  } catch (err) {
    console.error("[metrics] fatal error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
