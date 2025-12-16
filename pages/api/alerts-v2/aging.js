// pages/api/alerts-v2/aging.js
// ============================================================
// ALERT AGING — ENTERPRISE SAFE
// - ALWAYS returns numbers
// - NEVER returns null
// - NEVER throws
// - Dashboard-safe
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(200).json({
      ok: false,
      aging: {
        oldest: 0,
        avgAge: 0,
        over7: 0,
        over30: 0,
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
        aging: {
          oldest: 0,
          avgAge: 0,
          over7: 0,
          over30: 0,
        },
      });
    }

    const rows = await sql`
      SELECT created_at
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL;
    `;

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        ok: true,
        aging: {
          oldest: 0,
          avgAge: 0,
          over7: 0,
          over30: 0,
        },
      });
    }

    const now = Date.now();
    const ages = rows.map(r =>
      Math.floor((now - new Date(r.created_at).getTime()) / 86400000)
    );

    const oldest = Math.max(...ages);
    const avgAge = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    const over7 = ages.filter(d => d >= 7).length;
    const over30 = ages.filter(d => d >= 30).length;

    return res.status(200).json({
      ok: true,
      aging: {
        oldest,
        avgAge,
        over7,
        over30,
      },
    });
  } catch (err) {
    console.error("[alerts-v2/aging] ERROR:", err);

    // NEVER BREAK DASHBOARD
    return res.status(200).json({
      ok: false,
      aging: {
        oldest: 0,
        avgAge: 0,
        over7: 0,
        over30: 0,
      },
    });
  }
}
