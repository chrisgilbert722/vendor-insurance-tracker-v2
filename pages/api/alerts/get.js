// pages/api/alerts/get.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const alerts = await sql`
      SELECT *
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
      ORDER BY created_at DESC;
    `;

    return res.status(200).json({ ok: true, alerts });
  } catch (err) {
    console.error("[alerts/get] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
