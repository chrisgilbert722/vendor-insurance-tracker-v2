// pages/api/alerts-v2/sla.js
// ============================================================
// ALERTS SLA — ENTERPRISE SAFE
// - ALWAYS 200
// - ALWAYS sla:{}
// - NO engine imports
// - UUID-safe
// - Dashboard-safe
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  // HARD CONTRACT
  if (req.method !== "GET") {
    return res.status(200).json({
      ok: false,
      sla: {
        total: 0,
        breached: 0,
        dueSoon: 0,
        onTrack: 0,
      },
    });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD SKIP — dashboard safety
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        sla: {
          total: 0,
          breached: 0,
          dueSoon: 0,
          onTrack: 0,
        },
      });
    }

    const rows = await sql`
      SELECT expiration_date
      FROM policies
      WHERE org_id = ${orgId}
        AND expiration_date IS NOT NULL;
    `;

    let total = 0;
    let breached = 0;
    let dueSoon = 0;
    let onTrack = 0;

    const now = Date.now();

    for (const r of rows || []) {
      total++;
      const daysLeft = Math.floor(
        (new Date(r.expiration_date).getTime() - now) / 86400000
      );

      if (daysLeft < 0) breached++;
      else if (daysLeft <= 7) dueSoon++;
      else onTrack++;
    }

    return res.status(200).json({
      ok: true,
      sla: {
        total,
        breached,
        dueSoon,
        onTrack,
      },
    });
  } catch (err) {
    console.error("[alerts-v2/sla] ERROR:", err);

    // NEVER break dashboard
    return res.status(200).json({
      ok: false,
      sla: {
        total: 0,
        breached: 0,
        dueSoon: 0,
        onTrack: 0,
      },
    });
  }
}
