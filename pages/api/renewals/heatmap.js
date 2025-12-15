// pages/api/renewals/heatmap.js
// ============================================================
// RENEWALS HEATMAP — UUID SAFE + DASHBOARD SAFE
// Feeds Dashboard Renewal Heatmap (Next 90 Days)
// Never throws. Never casts UUIDs.
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD SKIP — dashboard safety
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        points: [],
      });
    }

    /*
      We bucket expirations by day for the next 90 days.
      This matches the existing dashboard heatmap expectation.
    */

    const rows = await sql`
      SELECT
        expiration_date::date AS day,
        COUNT(*)::int AS count
      FROM policies
      WHERE org_id = ${orgId}
        AND expiration_date IS NOT NULL
        AND expiration_date <= CURRENT_DATE + INTERVAL '90 days'
      GROUP BY day
      ORDER BY day ASC;
    `;

    const points = (rows || []).map((r) => ({
      date: r.day,
      value: r.count,
    }));

    return res.status(200).json({
      ok: true,
      points,
    });
  } catch (err) {
    console.error("[renewals/heatmap] ERROR:", err);

    // NEVER BREAK DASHBOARD
    return res.status(200).json({
      ok: false,
      points: [],
    });
  }
}
