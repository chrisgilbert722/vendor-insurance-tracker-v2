// pages/api/admin/vendors-lite.js
import { sql } from "../../../lib/db";
import { requireOrgId } from "../../../lib/requireOrg";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    // 🔒 Canonical org guard (UUID string only)
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const rows = await sql`
      SELECT
        id,
        name AS vendor_name
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    return res.status(200).json({
      ok: true,
      vendors: rows || [],
    });
  } catch (err) {
    console.error("[vendors-lite]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
}
