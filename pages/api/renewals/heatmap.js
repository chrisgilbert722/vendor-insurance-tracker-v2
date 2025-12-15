// pages/api/renewals/heatmap.js
// UUID-safe, skip-safe renewal heatmap (direct SQL)

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD GUARD — never crash UI
    if (!orgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        heatmap: [],
      });
    }

    const rows = await sql`
      SELECT
        DATE_TRUNC('day', expiration_date) AS day,
        COUNT(*)::int AS count
      FROM policies
      WHERE org_id = ${orgId}
        AND expiration_date IS NOT NULL
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const heatmap = (rows || []).map((r) => ({
      day: r.day,
      count: r.count,
    }));

    return res.status(200).json({
      ok: true,
      heatmap,
    });
  } catch (err) {
    console.error("[renewals/heatmap] swallowed error:", err);
    return res.status(200).json({
      ok: false,
      skipped: true,
      heatmap: [],
    });
  }
}

