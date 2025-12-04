// pages/api/dashboard/metrics.js
// Dashboard metrics API — production-safe and shaped for Dashboard V4.
// Uses alerts_v2 and vendors to derive:
// - globalScore
// - vendorCount
// - alerts breakdown
// - severityBreakdown
// - riskHistory (for RiskTimeline, ComplianceTrajectory)
// - alertTimeline (30d)
// - topAlertTypes

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

    // --------------------------------------
    // 1) Vendor count
    // --------------------------------------
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

    // --------------------------------------
    // 2) Alerts – last 6 months
    // --------------------------------------
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

    let alertRows = [];
    const now = new Date();

    try {
      alertRows = await sql`
        SELECT severity, type, created_at
        FROM alerts_v2
        WHERE org_id = ${orgId}
          AND created_at >= NOW() - INTERVAL '6 months';
      `;
    } catch (err) {
      console.error("[metrics] alerts_v2 load error:", err);
    }

    // Process alerts
    for (const a of alertRows) {
      const sev = (a.severity || "").toLowerCase();
      const type = (a.type || "").toLowerCase();
      const createdAt = a.created_at ? new Date(a.created_at) : now;
      const ageDays = Math.floor(
        (now.getTime() - createdAt.getTime()) / 86400000
      );

      // Expired alerts
      if (type.includes("renew_expired") || type.includes("expired")) {
        alerts.expired++;
      }

      // Critical in last 30 days
      if (sev === "critical" && ageDays <= 30) {
        alerts.critical30d++;
      }

      // Warning/Medium in last 90 days
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

    // --------------------------------------
    // 3) Risk history (6 months) & trajectory
    // --------------------------------------
    const monthBuckets = new Map();

    // Initialize last 6 months buckets to baseline 100
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      monthBuckets.set(key, {
        monthKey: key,
        monthLabel: d.toLocaleString("default", { month: "short" }),
        penalty: 0,
      });
    }

    // Apply penalties per alert per month
    for (const a of alertRows) {
      if (!a.created_at) continue;
      const d = new Date(a.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (!monthBuckets.has(key)) continue;

      const sev = (a.severity || "").toLowerCase();
      const type = (a.type || "").toLowerCase();

      let p = monthBuckets.get(key);
      let penalty = 0;

      if (type.includes("renew_expired") || type.includes("expired")) {
        penalty += 10;
      }

      if (sev === "critical") penalty += 6;
      else if (sev === "high") penalty += 4;
      else if (sev === "medium" || sev === "warning") penalty += 2;
      else if (sev === "low") penalty += 1;

      p.penalty += penalty;
      monthBuckets.set(key, p);
    }

    const riskHistory = Array.from(monthBuckets.values())
      .sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1))
      .map((bucket) => {
        const score = Math.max(0, 100 - bucket.penalty);
        return {
          month: bucket.monthLabel,
          score,
        };
      });

    // Map riskHistory into complianceTrajectory shape {label, score}
    const complianceTrajectory = riskHistory.map((r) => ({
      label: r.month,
      score: r.score,
    }));

    // --------------------------------------
    // 4) Alert timeline (last 30 days)
    // --------------------------------------
    let alertTimeline = [];
    try {
      const timelineRows = await sql`
        SELECT
          date_trunc('day', created_at) AS day,
          COUNT(*)::int AS total
        FROM alerts_v2
        WHERE org_id = ${orgId}
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day ASC;
      `;

      alertTimeline = timelineRows.map((r) => {
        const d = new Date(r.day);
        return {
          label: d.toLocaleDateString("default", { month: "short", day: "numeric" }),
          total: r.total,
        };
      });
    } catch (err) {
      console.error("[metrics] alertTimeline error:", err);
    }

    // --------------------------------------
    // 5) Top alert types
    // --------------------------------------
    let topAlertTypes = [];
    try {
      const typeRows = await sql`
        SELECT type, COUNT(*)::int AS count
        FROM alerts_v2
        WHERE org_id = ${orgId}
        GROUP BY type
        ORDER BY count DESC
        LIMIT 5;
      `;

      topAlertTypes = typeRows.map((r) => ({
        type: r.type,
        count: r.count,
      }));
    } catch (err) {
      console.error("[metrics] topAlertTypes error:", err);
    }

    // --------------------------------------
    // 6) Compute globalScore (0–100)
    // --------------------------------------
    const penaltyExpired = alerts.expired * 12;
    const penaltyCritical = alerts.critical30d * 6;
    const penaltyWarning = alerts.warning90d * 3;
    const penaltyElite = alerts.eliteFails * 8;

    let globalScore =
      100 - (penaltyExpired + penaltyCritical + penaltyWarning + penaltyElite);
    globalScore = Math.max(0, Math.min(100, globalScore));

    // --------------------------------------
    // Build final overview payload
    // --------------------------------------
    const overview = {
      globalScore,
      vendorCount,
      alerts,
      severityBreakdown,
      riskHistory,
      complianceTrajectory,
      alertTimeline,
      topAlertTypes,
    };

    return res.status(200).json({ ok: true, overview });
  } catch (err) {
    console.error("[metrics] fatal error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
