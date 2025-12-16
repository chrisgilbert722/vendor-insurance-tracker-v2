// pages/api/compliance/events.js
// ============================================================
// COMPLIANCE EVENTS — ENTERPRISE SAFE
// - UUID safe
// - ALWAYS items:[]
// - NEVER throws
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(200).json({ ok: false, items: [] });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 40)));

    // HARD SKIP — dashboard safety
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        items: [],
        skipped: true,
      });
    }

    const rows = await sql`
      SELECT
        occurred_at,
        event_type,
        source,
        vendor_id,
        alert_id
      FROM compliance_events
      WHERE org_id = ${orgId}
      ORDER BY occurred_at DESC
      LIMIT ${limit};
    `;

    return res.status(200).json({
      ok: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("[compliance/events] ERROR:", err);
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }
}
