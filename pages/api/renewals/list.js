// pages/api/renewals/list.js
// UUID-safe, skip-safe Renewals List (Enterprise Stable)

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);
    if (!orgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        items: [],
        reason: "missing_or_invalid_orgId",
      });
    }

    const days = Math.max(1, Math.min(365, Number(req.query.days || 90)));

    const rows = await sql`
      SELECT
        p.id,
        p.vendor_id,
        v.name AS vendor_name,
        p.coverage_type,
        p.expiration_date,
        (p.expiration_date - CURRENT_DATE) AS days_left
      FROM policies p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE p.org_id = ${orgId}
        AND p.expiration_date IS NOT NULL
        AND p.expiration_date <= CURRENT_DATE + (${days}::int || ' days')::interval
      ORDER BY p.expiration_date ASC;
    `;

    return res.status(200).json({
      ok: true,
      items: rows || [],
    });
  } catch (err) {
    console.error("[renewals/list] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load renewals",
    });
  }
}
