// pages/api/onboarding/vendors-status.js
// ==========================================================
// BULK ONBOARDING STATUS ENDPOINT (Step 4)
// Returns readiness state for ALL vendors in an org.
// ==========================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const orgId = req.query.orgId || 1;

    // -------------------------------------------------------
    // 1) FETCH VENDORS + LATEST DOCUMENT + REQUIREMENTS
    // -------------------------------------------------------
    const vendors = await sql`
      SELECT
        v.id,
        v.vendor_name,
        v.org_id,
        v.requirements_json,
        v.last_uploaded_coi,
        v.last_uploaded_at
      FROM vendors v
      WHERE v.org_id = ${orgId}
      ORDER BY v.vendor_name ASC;
    `;

    if (!vendors.length) {
      return res.status(200).json({
        ok: true,
        vendors: [],
      });
    }

    // -------------------------------------------------------
    // 2) FETCH ALERTS IN BULK (CRITICAL, COVERAGE, DOCUMENT)
    // -------------------------------------------------------
    const vendorIds = vendors.map((v) => v.id);

    const alerts = await sql`
      SELECT
        vendor_id,
        severity,
        type
      FROM alerts
      WHERE vendor_id = ANY(${vendorIds})
        AND status = 'Open';
    `;

    // Group alerts by vendor
    const alertMap = {};
    for (const a of alerts) {
      if (!alertMap[a.vendor_id]) alertMap[a.vendor_id] = [];
      alertMap[a.vendor_id].push(a);
    }

    // -------------------------------------------------------
    // 3) Evaluate each vendor’s onboarding readiness
    // -------------------------------------------------------
    const enriched = vendors.map((v) => {
      const vendorAlerts = alertMap[v.id] || [];

      const hasCriticalAlerts = vendorAlerts.some(
        (a) => a.severity && a.severity.toLowerCase() === "critical"
      );

      const coverageAlerts = vendorAlerts.filter(
        (a) => a.type?.toLowerCase() === "coverage"
      );

      const coverage_ok = coverageAlerts.length === 0;

      const endorsementAlerts = vendorAlerts.filter(
        (a) => a.type?.toLowerCase() === "endorsement"
      );

      const endorsements_ok = endorsementAlerts.length === 0;

      return {
        id: v.id,
        vendor_name: v.vendor_name,
        org_id: v.org_id,

        last_uploaded_coi: v.last_uploaded_coi,
        last_uploaded_at: v.last_uploaded_at,

        requirements_json: v.requirements_json,

        // AI readiness booleans
        coverage_ok,
        endorsements_ok,
        hasCriticalAlerts,
      };
    });

    return res.status(200).json({
      ok: true,
      vendors: enriched,
    });
  } catch (err) {
    console.error("[vendors-status ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
