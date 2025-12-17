// pages/api/admin/vendors-lite.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

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
      vendors: rows,
    });
  } catch (err) {
    console.error("[vendors-lite]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
