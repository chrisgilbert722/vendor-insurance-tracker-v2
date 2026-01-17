// pages/api/admin/vendor/overview.js
// ============================================================
// VENDOR INTELLIGENCE API (V5) - PRODUCTION SAFE
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
//
// All optional queries are fail-safe and return empty arrays
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
    // 1) LOAD VENDOR (required)
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
    // 2) ORG (required) + PORTAL TOKEN (optional)
    // ============================================================
    const orgRows = await sql`
      SELECT id, name
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;
    const org = orgRows[0] || null;

    let portalToken = null;
    try {
      const portalRows = await sql`
        SELECT token
        FROM vendor_portal_tokens
        WHERE vendor_id = ${vendorId}
        LIMIT 1;
      `;
      portalToken = portalRows[0]?.token || null;
    } catch (e) {
      console.warn("[vendor/overview] Portal token query failed:", e.message);
    }

    // ============================================================
    // 3) POLICIES (fail-safe)
    // ============================================================
    let policies = [];
    try {
      policies = await sql`
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
    } catch (e) {
      console.warn("[vendor/overview] Policies query failed:", e.message);
    }

    // ============================================================
    // 4) ALERTS (fail-safe)
    // ============================================================
    let alerts = [];
    try {
      alerts = await sql`
        SELECT
          id,
          severity,
          message,
          type,
          created_at
        FROM alerts_v2
        WHERE vendor_id = ${vendorId}
          AND org_id = ${orgId}
          AND resolved_at IS NULL
        ORDER BY severity DESC, created_at DESC;
      `;
    } catch (e) {
      console.warn("[vendor/overview] Alerts query failed:", e.message);
    }

    // ============================================================
    // 5) RULE ENGINE V5 SUMMARY (fail-safe)
    // ============================================================
    let failingRules = [];
    let passingRules = [];

    try {
      failingRules = await sql`
        SELECT
          id AS rule_id,
          severity,
          message
        FROM rule_results_v3
        WHERE vendor_id = ${vendorId}
          AND org_id = ${orgId}
          AND passed = FALSE;
      `;

      passingRules = await sql`
        SELECT
          id AS rule_id,
          message
        FROM rule_results_v3
        WHERE vendor_id = ${vendorId}
          AND org_id = ${orgId}
          AND passed = TRUE;
      `;
    } catch (e) {
      console.warn("[vendor/overview] Rule query failed:", e.message);
    }

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
    // 7) TIMELINE (fail-safe)
    // ============================================================
    let timeline = [];
    try {
      timeline = await sql`
        SELECT action, message, severity, created_at
        FROM vendor_timeline
        WHERE vendor_id = ${vendorId}
        ORDER BY created_at DESC
        LIMIT 50;
      `;
    } catch (e) {
      console.warn("[vendor/overview] Timeline query failed:", e.message);
    }

    // ============================================================
    // 8) DOCUMENTS (fail-safe)
    // ============================================================
    let documents = [];
    try {
      documents = await sql`
        SELECT id, document_type, file_url, ai_json, uploaded_at
        FROM vendor_documents
        WHERE vendor_id = ${vendorId}
        ORDER BY uploaded_at DESC;
      `;
    } catch (e) {
      console.warn("[vendor/overview] Documents query failed:", e.message);
    }

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
