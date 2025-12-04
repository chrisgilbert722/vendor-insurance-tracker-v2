// pages/api/alerts-v2/aging.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // Unresolved alerts only
    const rows = await sql`
      SELECT created_at
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL;
    `;

    if (rows.length === 0) {
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

    const now = new Date();
    const ages = rows.map((r) => {
      const created = new Date(r.created_at);
      return Math.floor((now - created) / (1000 * 60 * 60 * 24)); // days
    });

    const oldest = Math.max(...ages);
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;

    const over7 = ages.filter((d) => d >= 7).length;
    const over30 = ages.filter((d) => d >= 30).length;

    return res.status(200).json({
      ok: true,
      aging: {
        oldest,
        avgAge: Math.round(avgAge),
        over7,
        over30,
      },
    });
  } catch (err) {
    console.error("[aging] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
