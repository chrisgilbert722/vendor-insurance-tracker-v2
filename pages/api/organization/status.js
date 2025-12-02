// pages/api/organization/status.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const orgId = req.query.orgId;
    if (!orgId) {
      return res.json({ ok: false, error: "Missing orgId" });
    }

    const rows = await sql`
      SELECT onboarding_step
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.json({ ok: false, error: "Org not found" });
    }

    return res.json({
      ok: true,
      onboarding_step: rows[0].onboarding_step ?? 0,
    });
  } catch (err) {
    console.error("[organization/status] ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
}
