// pages/api/admin/vendor/overview.js
// ============================================================
// VENDOR INTELLIGENCE API (V5 + CONTRACT INTELLIGENCE V3)
// Powers:
//  • Admin Vendor Overview (/admin/vendor/[id])
//  • Admin Vendor Profile (/admin/vendor/[id]/profile)
//  • Vendor Drawer
//  • GVI Table (optional contract data)
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
    // 1) LOAD VENDOR (now includes contract_status fields)
    // ============================================================
    const vendorRows = await sql`
      SELECT
        id,
        name,
        org_id,
        contract_status,
        contract_risk_score,
        contract_issues_json
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
        limit_each_occurrence
      FROM policies
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    // ============================================================
    // 4) ALERTS (V5, open only)
    // ============================================================
    const alerts = await sql`
      SELECT
        id, severity, message, code, type, status,
        rule_label, created_at
      FROM alerts
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
        AND status = 'open'
      ORDER BY severity DESC, created_at DESC;
    `;

    // ============================================================
    // 5) RULE ENGINE V5 RESULTS
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
    // 6) COVERAGE INTEL SNAPSHOT
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

    // Map rule failures → coverage type buckets
    for (const f of failingRules) {
      const key = (f.field_key || "unknown")
        .split(".")
        .pop()
        .toLowerCase();
      if (!failuresByCoverage[key]) failuresByCoverage[key] = [];
      failuresByCoverage[key].push(f);
    }

    const intel = {
      coverageMap,
      failuresByCoverage,
    };

    // ============================================================
    // 7) TIMELINE
    // ============================================================
    const timeline = await sql`
      SELECT action, message, severity, created_at
      FROM vendor_timeline
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    // ============================================================
    // 8) DOCUMENTS (FULL V3 INTEL)
    // ============================================================
    const documents = await sql`
      SELECT
        id,
        document_type,
        file_url,
        ai_json,
        uploaded_at
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
      ORDER BY uploaded_at DESC;
    `;

    // Find latest contract
    const latestContract = documents.find(
      (d) => d.document_type === "contract"
    ) || null;

    // ============================================================
    // 9) METRICS (same as before)
    // ============================================================
    const metrics = {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
      highAlerts: alerts.filter((a) => a.severity === "high").length,
      mediumAlerts: alerts.filter((a) => a.severity === "medium").length,
      lowAlerts: alerts.filter((a) => a.severity === "low").length,
      failingRuleCount: failingRules.length,
      totalRules: engineSummary.totalRules,
      coverageTypes: Object.keys(coverageMap).length,
      expiredPolicies: Object.values(coverageMap).reduce(
        (sum, c) => sum + c.expired,
        0
      ),
      lastActivity: timeline[0]?.created_at || null,
    };

    // ============================================================
    // 10) CONTRACT INTELLIGENCE V3 (NEW)
    // ============================================================
    const contractIntel = {
      status: vendor.contract_status || "unknown",
      risk_score:
        vendor.contract_risk_score !== null
          ? vendor.contract_risk_score
          : null,
      issues: vendor.contract_issues_json || [],
      latestContract,
    };

    // ============================================================
    // 11) RESPONSE
    // ============================================================
    return res.status(200).json({
      ok: true,
      vendor,
      org,
      portalToken,

      policies,
      alerts,
      engine: engineSummary,
      intel,
      metrics,
      timeline,
      documents,

      // ⭐ NEW: Contract Intelligence added here
      contractIntel,
    });
  } catch (err) {
    console.error("[admin/vendor/overview] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
}
