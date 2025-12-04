// pages/api/alerts-v2/resolve.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { alertId, orgId } = req.body;

    if (!alertId || !orgId) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    await sql`
      UPDATE alerts_v2
      SET resolved_at = now()
      WHERE id = ${alertId} AND org_id = ${orgId};
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[alerts-v2/resolve]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
