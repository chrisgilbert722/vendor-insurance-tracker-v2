// pages/api/admin/vendor/overview.js
// ============================================================
// VENDOR INTELLIGENCE API (V5)
// ============================================================
//
// Returns:
//  • vendor
//  • org
//  • portalToken
//  • policies
//  • alerts
//  • engine (rule engine V5 summary)
//  • intel (coverage intel)
//  • timeline
//  • documents
//  • metrics
// ============================================================

import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { id } = req.query;
    const vendorId = id ? parseInt(id, 10) : null;

    if (!vendorId || Number.isNaN(vendorId)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid or missing vendorId",
      });
    }

    // ============================================================
    // 1) LOAD VENDOR
    // ============================================================
    const vendorRows = await sql`
      SELECT
        id,
        name,
        org_id
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;

    if (!vendorRows.length) {
      return res.status(404).json({ ok: false, error: "Vendor not found." });
    }

    const vendor = vendorRows[0];
    const orgId = vendor.org_id;

    // ============================================================
    // 2) ORG + PORTAL TOKEN
    // ============================================================
    const orgRows = await sql`
      SELECT id, name 
      FROM orgs
      WHERE id = ${orgId}
      LIMIT 1;
    `;
    const org = orgRows[0] || null;

    const portalRows = await sql`
      SELECT token 
      FROM vendor_portal_tokens
      WHERE vendor_id = ${vendorId}
      LIMIT 1;
    `;
    const portalToken = portalRows[0]?.token || null;

    // ============================================================
    // 3) POLICIES
    // ============================================================
    const policies = await sql`
      SELECT
        id,
        coverage_type,
        policy_number,
        carrier,
        expiration_date,
        effective_date,
        limit_each_occurrence,
        auto_limit,
        work_comp_limit,
        umbrella_limit
      FROM policies
      WHERE vendor_id = ${vendorId} AND org_id = ${orgId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    // ============================================================
    // 4) ALERTS (V5)
    // ============================================================
    const alerts = await sql`
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
    // 5) RULE ENGINE V5 SUMMARY (from results table)
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

    const engine = {
      totalRules: failingRules.length + passingRules.length,
      failedCount: failingRules.length,
      passingCount: passingRules.length,
      failures: failingRules,
      passes: passingRules,
    };

    // ============================================================
    // 6) COVERAGE INTELLIGENCE SNAPSHOT
    // ============================================================
    const coverageMap = {};
    const failuresByCoverage = {};

    for (const p of policies) {
      const key = (p.coverage_type || "unknown").toLowerCase();
      if (!coverageMap[key]) coverageMap[key] = { count: 0, expired: 0 };
      coverageMap[key].count++;

      const exp = p.expiration_date ? new Date(p.expiration_date) : null;
      if (exp && exp < new Date()) coverageMap[key].expired++;
    }

    for (const f of failingRules) {
      const key = (f.field_key || "unknown").split(".").pop().toLowerCase();
      if (!failuresByCoverage[key]) failuresByCoverage[key] = [];
      failuresByCoverage[key].push(f);
    }

    const intel = { coverageMap, failuresByCoverage };

    // ============================================================
    // 7) TIMELINE (last 50)
    // ============================================================
    const timeline = await sql`
      SELECT action, message, severity, created_at
      FROM vendor_timeline
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    // ============================================================
    // 8) DOCUMENTS (all types: COI, contract, W9, etc.)
    // ============================================================
    const documents = await sql`
      SELECT id, document_type, file_url, ai_json, uploaded_at
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
      ORDER BY uploaded_at DESC;
    `;

    // ============================================================
    // 9) METRICS
    // ============================================================
    const metrics = {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
      highAlerts: alerts.filter((a) => a.severity === "high").length,
      mediumAlerts: alerts.filter((a) => a.severity === "medium").length,
      lowAlerts: alerts.filter((a) => a.severity === "low").length,
      failingRuleCount: engine.failedCount,
      totalRules: engine.totalRules,
      coverageTypes: Object.keys(coverageMap).length,
      expiredPolicies: Object.values(coverageMap).reduce(
        (sum, c) => sum + c.expired,
        0
      ),
      lastActivity: timeline[0]?.created_at || null,
    };

    // ============================================================
    // 10) RETURN PAYLOAD
    // ============================================================
    return res.status(200).json({
      ok: true,

      vendor,
      org,
      portalToken,

      policies,
      alerts,
      engine,
      intel,
      timeline,
      documents,
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
