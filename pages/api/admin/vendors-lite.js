// pages/api/admin/vendors-lite.js
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // 🔒 Resolve external org → internal numeric org_id
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // -------------------------------------------------
    // Lightweight vendor list for sidebar / dashboards
    // -------------------------------------------------
    const rows = await sql`
      SELECT
        v.id,
        v.name,
        v.status,
        v.risk_score,
        v.updated_at
      FROM vendors v
      WHERE v.org_id = ${orgId}
      ORDER BY v.updated_at DESC
      LIMIT 50;
    `;

    return res.status(200).json({
      ok: true,
      vendors: rows || [],
    });
  } catch (err) {
    console.error("[vendors-lite] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to load vendors",
    });
  }
}
