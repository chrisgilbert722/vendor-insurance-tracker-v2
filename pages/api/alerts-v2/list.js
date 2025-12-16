// pages/api/renewals/list.js
// ============================================================
// RENEWALS LIST — ENTERPRISE SAFE
// - UUID safe
// - ALWAYS returns items:[]
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
    const days = Math.max(1, Math.min(365, Number(req.query.days || 90)));

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
        id,
        vendor_id,
        coverage_type,
        expiration_date
      FROM policies
      WHERE org_id = ${orgId}
        AND expiration_date IS NOT NULL
        AND expiration_date <= CURRENT_DATE + ${days}
      ORDER BY expiration_date ASC;
    `;

    return res.status(200).json({
      ok: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("[renewals/list] ERROR:", err);
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }
}

