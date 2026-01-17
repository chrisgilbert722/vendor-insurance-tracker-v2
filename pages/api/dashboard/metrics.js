// pages/api/dashboard/metrics.js
// Dashboard metrics API — ORG-ID LOCKED (NO FALLBACKS)
// Production-safe, policy-aware, placeholder-resilient
// HARD REQUIRE: orgId must be provided by client

import { sql } from "../../../lib/db";

/* ============================================================
   🔒 ORG GUARD — SINGLE SOURCE OF TRUTH
============================================================ */
function requireOrgId(req) {
  const raw =
    req.query?.orgId ??
    req.body?.orgId ??
    null;

  const orgId = Number(raw);

  if (!Number.isInteger(orgId)) {
    const err = new Error("Missing or invalid orgId");
    err.status = 400;
    throw err;
  }

  return orgId;
}

export default async function handler(req, res) {
  try {
    // 🔒 LOCKED — no inference, no fallback
    const orgId = requireOrgId(req);

    /* ============================================================
       1) Vendor count (ACTIVE ONLY — exclude at_rest)
    ============================================================ */
    let vendorCount = 0;
    try {
      const rows = await sql`
        SELECT COUNT(*)::int AS vendor_count
        FROM vendors
        WHERE org_id = ${orgId}
          AND (status IS NULL OR status = 'active');
      `;
      vendorCount = rows[0]?.vendor_count ?? 0;
    } catch (err) {
      console.error("[metrics] vendorCount error:", err);
    }

    /* ============================================================
       2) Policy awareness (ACTIVE VENDORS ONLY)
    ============================================================ */
    let policyCount = 0;
    let placeholderCount = 0;

    try {
      const policyRows = await sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE p.is_placeholder = true)::int AS placeholders
        FROM policies p
        INNER JOIN vendors v ON v.id = p.vendor_id
        WHERE p.org_id = ${orgId}
          AND (v.status IS NULL OR v.status = 'active');
      `;

      policyCount = policyRows[0]?.total ?? 0;
      placeholderCount = policyRows[0]?.placeholders ?? 0;
    } catch (err) {
      console.error("[metrics] policyCount error:", err);
    }

    /* ============================================================
       3) Alerts (last 6 months)
    ============================================================ */
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

    for (const a of alertRows) {
      const sev = (a.severity || "").toLowerCase();
      const type = (a.type || "").toLowerCase();
      const createdAt = a.created_at ? new Date(a.created_at) : now;
      const ageDays = Math.floor(
        (now.getTime() - createdAt.getTime()) / 86400000
      );

      if (type.includes("expired")) alerts.expired++;
      if (sev === "critical" && ageDays <= 30) alerts.critical30d++;
      if ((sev === "warning" || sev === "medium") && ageDays <= 90)
        alerts.warning90d++;
      if (type.includes("elite") && type.includes("fail"))
        alerts.eliteFails++;

      if (sev === "critical") severityBreakdown.critical++;
      else if (sev === "high") severityBreakdown.high++;
      else if (sev === "medium" || sev === "warning")
        severityBreakdown.medium++;
      else if (sev === "low") severityBreakdown.low++;
    }

    /* ============================================================
       4) Risk history (6 months)
    ============================================================ */
    const monthBuckets = new Map();

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

    for (const a of alertRows) {
      if (!a.created_at) continue;
      const d = new Date(a.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (!monthBuckets.has(key)) continue;

      const sev = (a.severity || "").toLowerCase();
      let penalty = 0;

      if (sev === "critical") penalty += 6;
      else if (sev === "high") penalty += 4;
      else if (sev === "medium" || sev === "warning") penalty += 2;
      else if (sev === "low") penalty += 1;

      monthBuckets.get(key).penalty += penalty;
    }

    const riskHistory = Array.from(monthBuckets.values())
      .sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1))
      .map((b) => ({
        month: b.monthLabel,
        score: Math.max(0, 100 - b.penalty),
      }));

    const complianceTrajectory = riskHistory.map((r) => ({
      label: r.month,
      score: r.score,
    }));

    /* ============================================================
       5) Alert timeline (30 days)
    ============================================================ */
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
          label: d.toLocaleDateString("default", {
            month: "short",
            day: "numeric",
          }),
          total: r.total,
        };
      });
    } catch (err) {
      console.error("[metrics] alertTimeline error:", err);
    }

    /* ============================================================
       6) Top alert types
    ============================================================ */
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

    /* ============================================================
       7) Global score (bootstrapped)
    ============================================================ */
    let globalScore = 100;

    if (policyCount > 0 && placeholderCount > 0) {
      globalScore -= Math.min(20, placeholderCount * 5);
    }

    globalScore -= alerts.expired * 12;
    globalScore -= alerts.critical30d * 6;
    globalScore -= alerts.warning90d * 3;
    globalScore -= alerts.eliteFails * 8;

    globalScore = Math.max(0, Math.min(100, globalScore));

    /* ============================================================
       Final payload
    ============================================================ */
    return res.status(200).json({
      ok: true,
      overview: {
        globalScore,
        vendorCount,
        policyCount,
        placeholderCount,
        alerts,
        severityBreakdown,
        riskHistory,
        complianceTrajectory,
        alertTimeline,
        topAlertTypes,
      },
    });
  } catch (err) {
    console.error("[metrics] fatal error:", err);
    return res
      .status(err.status || 500)
      .json({ ok: false, error: err.message });
  }
}
