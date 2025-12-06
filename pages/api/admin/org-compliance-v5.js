// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE INTELLIGENCE (V5)
//
// GET /api/admin/org-compliance-v5?orgId=...
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

    // 1) ORG INFO
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

    // 2) VENDORS
    const vendorRows = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgIdInt}
      ORDER BY id ASC;
    `;
    const vendorCount = vendorRows.length;

    // 3) VENDOR COMPLIANCE CACHE (V5 scores)
    const cacheRows = await sql`
      SELECT vendor_id, score, last_run_at
      FROM vendor_compliance_cache
      WHERE org_id = ${orgIdInt};
    `;

    let globalScoreAvg = 0;
    if (cacheRows.length) {
      const sum = cacheRows.reduce(
        (acc, r) => acc + (Number(r.score) || 0),
        0
      );
      globalScoreAvg = Math.round(sum / cacheRows.length);
    }

    // 4) ALERTS (V5 — from alerts table)
    const alertRows = await sql`
      SELECT severity
      FROM alerts
      WHERE org_id = ${orgIdInt}
        AND status = 'open';
    `;

    const alertCounts = {
      critical: alertRows.filter((a) => a.severity === "critical").length,
      high: alertRows.filter((a) => a.severity === "high").length,
      medium: alertRows.filter((a) => a.severity === "medium").length,
      low: alertRows.filter((a) => a.severity === "low").length,
    };

    // 5) POLICIES
    const policyRows = await sql`
      SELECT
        id,
        vendor_id,
        coverage_type,
        expiration_date
      FROM policies
      WHERE org_id = ${orgIdInt}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    const coverageBreakdownMap = {};
    let expiredPolicies = 0;

    for (const p of policyRows) {
      const key = (p.coverage_type || "Unknown").toLowerCase();
      if (!coverageBreakdownMap[key]) {
        coverageBreakdownMap[key] = { coverage: key, count: 0, expired: 0 };
      }
      coverageBreakdownMap[key].count++;

      if (p.expiration_date) {
        const d = new Date(p.expiration_date);
        if (!Number.isNaN(d.getTime()) && d < new Date()) {
          coverageBreakdownMap[key].expired++;
          expiredPolicies++;
        }
      }
    }

    const coverageBreakdown = Object.values(coverageBreakdownMap);

    // 6) TOP RISK VENDORS (lowest scores)
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

    const metrics = {
      vendorCount,
      globalScoreAvg,
      alertCounts,
      expiredPolicies,
      coverageTypes: coverageBreakdown.length,
    };

    return res.status(200).json({
      ok: true,
      org,
      metrics,
      coverageBreakdown,
      topRiskVendors: topRiskRows,
    });
  } catch (err) {
    console.error("[admin/org-compliance-v5] ERROR", err);
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
}
