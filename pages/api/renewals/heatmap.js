// pages/api/renewals/heatmap.js
// ============================================================
// RENEWALS HEATMAP — UUID SAFE + DASHBOARD SAFE (CANONICAL)
// - Feeds existing Dashboard Renewal Heatmap
// - Never casts UUIDs
// - Never throws 500s
// - Returns empty array when orgId missing
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

    // HARD SKIP — keep dashboard calm
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        points: [],
      });
    }

    /*
      Bucket policy expirations by date for the next 90 days.
      Matches existing dashboard heatmap expectations.
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
