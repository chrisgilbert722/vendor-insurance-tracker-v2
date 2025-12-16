// pages/api/alerts-v2/top-types.js
// ============================================================
// ALERT TOP TYPES — ENTERPRISE SAFE
// - ALWAYS 200
// - ALWAYS items:[]
// - NO engine imports
// - Dashboard-safe
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  // HARD CONTRACT
  if (req.method !== "GET") {
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 8)));

    // HARD SKIP — dashboard safety
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        items: [],
      });
    }

    const rows = await sql`
      SELECT
        type,
        COUNT(*)::int AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
      GROUP BY type
      ORDER BY COUNT(*) DESC
      LIMIT ${limit};
    `;

    return res.status(200).json({
      ok: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("[alerts-v2/top-types] ERROR:", err);

    // NEVER break dashboard
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }
}
