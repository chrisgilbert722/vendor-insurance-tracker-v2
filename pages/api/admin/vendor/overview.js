// pages/api/admin/vendor/overview.js
// ============================================================
// VENDOR INTELLIGENCE API (V5)
// Powers:
//  • Admin Vendor Overview (/admin/vendor/[id])
//  • Admin Vendor Profile (/admin/vendor/[id]/profile)
//  • Future org dashboards + fix-plan + intel
// ============================================================

import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ ok: false, error: "Method not allowed" });
    }

    const { id } = req.query;
    const vendorId = id ? parseInt(id, 10) : null;

    if (!vendorId || Number.isNaN(vendorId)) {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid vendor id.",
      });
    }

    // ============================================================
    // 1) LOAD VENDOR
    // ============================================================
    const vendorRows = await sql`
      SELECT id, name, org_id
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;

    if (!vendorRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found.",
      });
    }

    const vendor = vendorRows[0];
    const orgId = vendor.org_id;

    // ============================================================
    // 2) LOAD ORG + PORTAL TOKEN
    // ============================================================
    const portalRows = await sql`
      SELECT token
      FROM vendor_portal_tokens
      WHERE vendor_id = ${vendorId}
      LIMIT 1;
    `;

    const portalToken = portalRows[0]?.token || null;

    const orgRows = await sql`
      SELECT id, name
      FROM orgs
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    const org = orgRows[0] || null;

    // ============================================================
    // 3) LOAD POLICIES
    // ============================================================
    const policyRows = await sql`
      SELECT
        id,
        coverage_type,
        policy_number,
        carrier,
        expiration_date,
        effective_date,
        limit_each_occurrence
      FROM policies
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    // ============================================================
    // 4) LOAD **V5 ALERTS** (from alerts table)
    // ============================================================
    const alertRows = await sql`
      SELECT
        id,
        severity,
        message,
        code,
        type,
        status,
        rule_label,
        created_at
      FROM alerts
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
        AND status = 'open'
      ORDER BY severity DESC, created_at DESC;
    `;

    // ============================================================
    // 5) LOAD RULE ENGINE V5 RESULTS
    // (rule_results_v3 is now driven by V5 engine logic)
    // ============================================================
    const failingRules = await sql`
      SELECT
        rr.requirement_id AS rule_id,
        rr.severity,
        rr.message,
        r.field_key,
        r.operator,
        r.expected_value,
        r.group_id
      FROM rule_results_v3 rr
      LEFT JOIN requirements_rules_v2 r
        ON r.id = rr.requirement_id
      WHERE rr.vendor_id = ${vendorId}
        AND rr.org_id = ${orgId}
        AND rr.passed = FALSE;
    `;

    const passingRules = await sql`
      SELECT
        rr.requirement_id AS rule_id,
        rr.message,
        r.field_key,
        r.operator,
        r.expected_value
      FROM rule_results_v3 rr
      LEFT JOIN requirements_rules_v2 r
        ON r.id = rr.requirement_id
      WHERE rr.vendor_id = ${vendorId}
        AND rr.org_id = ${orgId}
        AND rr.passed = TRUE;
    `;

    const engineSummary = {
      totalRules: failingRules.length + passingRules.length,
      failedCount: failingRules.length,
      passingCount: passingRules.length,
      failures: failingRules,
      passes: passingRules,
    };

    // ============================================================
    // 6) COVERAGE INTELLIGENCE SNAPSHOT (V2)
    // ============================================================
    const coverageMap = {};
    const failuresByCoverage = {};

    for (const p of policyRows) {
      const key = (p.coverage_type || "unknown").toLowerCase();

      if (!coverageMap[key])
        coverageMap[key] = { count: 0, expired: 0 };

      coverageMap[key].count++;

      // Expiration check
      const exp = p.expiration_date
        ? new Date(p.expiration_date)
        : null;

      if (exp && exp < new Date()) coverageMap[key].expired++;
    }

    // Map failing rules to coverage categories
    for (const f of failingRules) {
      const key = (f.field_key || "unknown")
        .split(".")
        .pop()
        .toLowerCase();

      if (!failuresByCoverage[key])
        failuresByCoverage[key] = [];

      failuresByCoverage[key].push(f);
    }

    const intel = {
      coverageMap,
      failuresByCoverage,
    };

    // ============================================================
    // 7) TIMELINE EVENTS (existing table)
    // ============================================================
    const timelineRows = await sql`
      SELECT action, message, severity, created_at
      FROM vendor_timeline
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    // ============================================================
    // 8) DOCUMENTS (existing)
    // ============================================================
    const documentRows = await sql`
      SELECT id, doc_type, filename, mimetype, created_at
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC;
    `;

    // ============================================================
    // 9) METRICS (V5)
    // ============================================================
    const metrics = {
      totalAlerts: alertRows.length,
      criticalAlerts: alertRows.filter((a) => a.severity === "critical").length,
      highAlerts: alertRows.filter((a) => a.severity === "high").length,
      mediumAlerts: alertRows.filter((a) => a.severity === "medium").length,
      lowAlerts: alertRows.filter((a) => a.severity === "low").length,
      failingRuleCount: failingRules.length,
      totalRules: engineSummary.totalRules,
      coverageTypes: Object.keys(coverageMap).length,
      expiredPolicies: Object.values(coverageMap).reduce(
        (sum, c) => sum + c.expired,
        0
      ),
      lastActivity: timelineRows[0]?.created_at || null,
    };

    // ============================================================
    // 10) RETURN
    // ============================================================
    return res.status(200).json({
      ok: true,
      vendor,
      org,
      portalToken,

      // Primary data
      policies: policyRows,
      alerts: alertRows,
      engine: engineSummary,
      intel,
      timeline: timelineRows,
      documents: documentRows,
      metrics,
    });
  } catch (err) {
    console.error("[admin/vendor/overview] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
}
