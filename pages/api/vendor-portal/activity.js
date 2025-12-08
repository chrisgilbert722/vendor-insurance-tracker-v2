// pages/api/vendor/activity.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ ok: false, error: "Missing token" });
  }

  try {
    // 1) Find vendor by magic token
    const vendorRows = await sql`
      SELECT id, org_id
      FROM vendors
      WHERE magic_link_token = ${token}
      LIMIT 1;
    `;

    if (vendorRows.length === 0) {
      return res.status(404).json({ ok: false, error: "Invalid token" });
    }

    const vendor = vendorRows[0];

    // 2) Load timeline entries
    const rows = await sql`
      SELECT
        id,
        action,
        message,
        created_at,
        severity
      FROM vendor_activity_log
      WHERE vendor_id = ${vendor.id}
      ORDER BY created_at DESC;
    `;

    return res.status(200).json({
      ok: true,
      activity: rows,
    });

  } catch (err) {
    console.error("[vendor/activity]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
