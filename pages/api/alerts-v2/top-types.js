// pages/api/alerts-v2/top-types.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId, limit = 5 } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const rows = await sql`
      SELECT type, COUNT(*) AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
      GROUP BY type
      ORDER BY COUNT(*) DESC
      LIMIT ${limit};
    `;

    const top = rows.map((r) => ({
      type: r.type,
      count: Number(r.count),
    }));

    return res.status(200).json({ ok: true, top });
  } catch (err) {
    console.error("[top-types]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
