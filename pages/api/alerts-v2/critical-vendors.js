// pages/api/alerts-v2/critical-vendors.js
// ============================================================
// CRITICAL VENDORS — ENTERPRISE SAFE
// - ALWAYS 200
// - ALWAYS items:[]
// - NO engine imports
// - UUID-safe
// - Dashboard-safe
// ============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  // HARD CONTRACT
  if (req.method !== "GET") {
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }

  try {
    const orgId = Number(req.query.orgId);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));

    // HARD SKIP — dashboard safety
    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        items: [],
      });
    }

    const rows = await sql`
      SELECT
        vendor_id,
        COUNT(*)::int AS critical_count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
        AND LOWER(severity) = 'critical'
      GROUP BY vendor_id
      ORDER BY COUNT(*) DESC
      LIMIT ${limit};
    `;

    return res.status(200).json({
      ok: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("[alerts-v2/critical-vendors] ERROR:", err);

    // NEVER break dashboard
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }
}
