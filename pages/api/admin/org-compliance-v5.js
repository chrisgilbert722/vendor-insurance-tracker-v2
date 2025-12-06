// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE ENGINE V5
//
// GET /api/admin/org-compliance-v5?orgId=...
//
// Aggregates:
//  - Vendor compliance scores (vendor_compliance_cache)
//  - V5 alerts (alerts table)
//  - V5 rule failures (rule_results_v3)
//  - Policies (coverage + expirations)
//  - Tiers vendors into Elite / Preferred / Watch / HighRisk / Severe
// ============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ ok: false, error: "Method not allowed" });
    }

    const { orgId } = req.query;
    const orgIdInt = orgId ? parseInt(orgId, 10) : null;

    if (!orgIdInt || Number.isNaN(orgIdInt)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid orgId." });
    }

    // ============================================================
    // 1) ORG INFO
    // ============================================================
    const orgRows = await sql`
      SELECT id, name
      FROM orgs
      WHERE id = ${orgIdInt}
      LIMIT 1;
    `;
    if (!orgRows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Org not found." });
    }
    const org = orgRows[0];

    // ============================================================
    // 2) VENDORS UNDER THIS ORG
    // ============================================================
    const vendorRows = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgIdInt}
      ORDER BY id ASC;
    `;
    const vendorCount = vendorRows.length;

    // ============================================================
    // 3) VENDOR COMPLIANCE CACHE (V5 SCORES)
    // ============================================================
    const cacheRows = await sql`
      SELECT vendor_id, score, last_run_at
      FROM vendor_compliance_cache
      WHERE org_id = ${orgIdInt};
    `;

    let globalScoreAvg = 0;
    let bands = {
      elite: 0,
      preferred: 0,
      watch: 0,
      high_risk: 0,
      severe: 0,
    };

    const scoreByVendor = {};

    if (cacheRows.length) {
      let sum = 0;
      cacheRows.forEach((row) => {
        const s = Number(row.score) || 0;
        sum += s;
        scoreByVendor[row.vendor_id] = s;

        if (s >= 85) bands.elite++;
        else if (s >= 70) bands.preferred++;
        else if (s >= 55) bands.watch++;
        else if (s >= 35) bands.high_risk++;
        else bands.severe++;
      });
      globalScoreAvg = Math.round(sum / cacheRows.length);
    }

    // ============================================================
    // 4) ALERTS V5 (alerts table — severity + vendor breakdown)
    // ============================================================
    const alertRows = await sql`
      SELECT vendor_id, severity
      FROM alerts
      WHERE org_id = ${orgIdInt}
        AND status = 'open';
    `;

    const alertCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const alertsByVendor = {}; // { vendorId: { total, critical, high, medium, low } }

    for (const a of alertRows) {
      const sev = (a.severity || "").toLowerCase();
      const vid = a.vendor_id;

      if (!alertsByVendor[vid]) {
        alertsByVendor[vid] = {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
      }

      alertsByVendor[vid].total++;

      if (sev === "critical") {
        alertCounts.critical++;
        alertsByVendor[vid].critical++;
      } else if (sev === "high") {
        alertCounts.high++;
        alertsByVendor[vid].high++;
      } else if (sev === "medium") {
        alertCounts.medium++;
        alertsByVendor[vid].medium++;
      } else {
        alertCounts.low++;
        alertsByVendor[vid].low++;
      }
    }

    // ============================================================
    // 5) RULE FAILURES (V5) FROM rule_results_v3
    // ============================================================
    const failureRows = await sql`
      SELECT vendor_id, severity
      FROM rule_results_v3
      WHERE org_id = ${orgIdInt}
        AND passed = FALSE;
    `;

    const ruleFailureCounts = {
      totalFailures: failureRows.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const failingVendors = new Set();

    for (const f of failureRows) {
      const sev = (f.severity || "").toLowerCase();
      failingVendors.add(f.vendor_id);

      if (sev === "critical") ruleFailureCounts.critical++;
      else if (sev === "high") ruleFailureCounts.high++;
      else if (sev === "medium") ruleFailureCounts.medium++;
      else ruleFailureCounts.low++;
    }

    // ============================================================
    // 6) POLICIES — COVERAGE + EXPIRATIONS (HEATMAP)
    // ============================================================
    const policyRows = await sql`
      SELECT
        coverage_type,
        expiration_date
      FROM policies
      WHERE org_id = ${orgIdInt}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    const coverageMap = {};
    let expiredPolicies = 0;

    for (const p of policyRows) {
      const key = (p.coverage_type || "Unknown").toLowerCase();
      if (!coverageMap[key]) {
        coverageMap[key] = { coverage: key, count: 0, expired: 0 };
      }
      coverageMap[key].count++;

      if (p.expiration_date) {
        const d = new Date(p.expiration_date);
        if (!Number.isNaN(d.getTime()) && d < new Date()) {
          coverageMap[key].expired++;
          expiredPolicies++;
        }
      }
    }

    const coverageBreakdown = Object.values(coverageMap);
    const coverageTypes = coverageBreakdown.length;

    // ============================================================
    // 7) TOP RISK VENDORS (LOWEST SCORES)
    // ============================================================
    const topRiskRows = await sql`
      SELECT
        c.vendor_id,
        c.score,
        v.name AS vendor_name
      FROM vendor_compliance_cache c
      LEFT JOIN vendors v
        ON v.id = c.vendor_id
      WHERE c.org_id = ${orgIdInt}
      ORDER BY c.score ASC NULLS LAST
      LIMIT 10;
    `;

    // ============================================================
    // 8) METRICS SUMMARY
    // ============================================================
    const metrics = {
      vendorCount,
      globalScoreAvg,
      scoreBands: bands,
      alertCounts,
      ruleFailureCounts,
      failingVendorCount: failingVendors.size,
      expiredPolicies,
      coverageTypes,
    };

    // ============================================================
    // 9) RESPONSE PAYLOAD
    // ============================================================
    return res.status(200).json({
      ok: true,
      org,
      metrics,
      coverageBreakdown,
      topRiskVendors: topRiskRows,
      scoreByVendor,
      alertsByVendor,
      vendors: vendorRows,
    });
  } catch (err) {
    console.error("[admin/org-compliance-v5] ERROR", err);
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
}
