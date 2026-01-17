// pages/api/alerts-v2/heat-signature.js
// ============================================================
// ALERT HEAT SIGNATURE — ENTERPRISE SAFE
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
    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));

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
        DATE_TRUNC('day', created_at) AS day,
        COUNT(*)::int AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
        AND created_at >= NOW() - (${days}::int || ' days')::interval
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    return res.status(200).json({
      ok: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("[alerts-v2/heat-signature] ERROR:", err);

    // NEVER break dashboard
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }
}
