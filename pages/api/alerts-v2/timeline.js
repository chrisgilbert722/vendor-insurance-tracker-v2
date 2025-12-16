// pages/api/alerts-v2/timeline.js
// ============================================================
// ALERTS TIMELINE — ENTERPRISE SAFE
// - UUID safe
// - ALWAYS returns items:[]
// - NEVER throws
// - NEVER returns 500
// - Dashboard-safe
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  // HARD CONTRACT — dashboard safety
  if (req.method !== "GET") {
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);
    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));

    // HARD SKIP — no org context
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        items: [],
      });
    }

    const rows = await sql`
      SELECT
        created_at,
        severity,
        type,
        message,
        vendor_id
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
        AND created_at >= NOW() - (${days}::int || ' days')::interval
      ORDER BY created_at DESC
      LIMIT 200;
    `;

    // ALWAYS return array
    return res.status(200).json({
      ok: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("[alerts-v2/timeline] ERROR:", err);

    // NEVER BREAK DASHBOARD
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }
}

