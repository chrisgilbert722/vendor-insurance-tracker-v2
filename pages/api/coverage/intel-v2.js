// pages/api/coverage/intel-v2.js
// ============================================================
// COVERAGE INTELLIGENCE ENGINE V2 — EARLY VERSION
//
// GET /api/coverage/intel-v2?orgId=...&vendorId=...
//
// Does:
// 1) Load policies for vendor/org
// 2) Load V5 alerts + failing rules
// 3) Computes simple intelligence:
//    - Has GL/Auto/WC/Umbrella?
//    - Any expired / near expiry?
//    - Number of rule failures per coverage type
// 4) Returns a summary object for UI to render
// ============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId, vendorId } = req.query || {};
    if (!orgId || !vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or vendorId.",
      });
    }

    const policies = await sql`
      SELECT
        id,
        coverage_type,
        policy_number,
        carrier,
        expiration_date,
        limit_each_occurrence
      FROM policies
      WHERE org_id = ${orgId} AND vendor_id = ${vendorId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    const alerts = await sql`
      SELECT
        id,
        severity,
        code,
        message,
        created_at,
        type
      FROM alerts
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
        AND status = 'open'
      ORDER BY created_at DESC;
    `;

    const failingRules = await sql`
      SELECT
        rr.requirement_id AS rule_id,
        rr.severity,
        rr.message,
        r.coverage_key,
        r.field_key
      FROM rule_results_v3 rr
      LEFT JOIN requirements_rules_v2 r
        ON r.id = rr.requirement_id
      WHERE rr.org_id = ${orgId}
        AND rr.vendor_id = ${vendorId}
        AND rr.passed = FALSE;
    `;

    // Basic coverage presence map
    const coverageMap = {};
    for (const p of policies) {
      const key = (p.coverage_type || "Unknown").toLowerCase();
      if (!coverageMap[key]) coverageMap[key] = { count: 0, expired: 0 };
      coverageMap[key].count += 1;

      if (p.expiration_date) {
        const dParts = String(p.expiration_date).split("/");
        let exp = null;
        if (dParts.length === 3) {
          const [mm, dd, yyyy] = dParts;
          exp = new Date(`${yyyy}-${mm}-${dd}`);
        } else {
          exp = new Date(p.expiration_date);
        }
        if (!Number.isNaN(exp?.getTime()) && exp < new Date()) {
          coverageMap[key].expired += 1;
        }
      }
    }

    // Rule failures per coverage "key"
    const failuresByCoverage = {};
    for (const f of failingRules) {
      const key = (f.coverage_key || f.field_key || "unknown").toLowerCase();
      if (!failuresByCoverage[key]) failuresByCoverage[key] = [];
      failuresByCoverage[key].push(f);
    }

    return res.status(200).json({
      ok: true,
      orgId,
      vendorId,
      policies,
      alerts,
      coverageMap,
      failuresByCoverage,
    });
  } catch (err) {
    console.error("[coverage/intel-v2] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Coverage intelligence failed.",
    });
  }
}
