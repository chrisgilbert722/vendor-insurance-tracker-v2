// pages/api/vendor/timeline.js
// D2 — Vendor Activity Timeline API
//-------------------------------------

import { getVendorActivityTimeline } from "../../../lib/vendorActivity";
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    // 1) Lookup vendor from magic link
    const rows = await sql`
      SELECT id
      FROM vendors
      WHERE magic_link_token = ${token}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Invalid vendor token." });
    }

    const vendorId = rows[0].id;

    // 2) Load activity timeline
    const timeline = await getVendorActivityTimeline(vendorId, 50);

    return res.status(200).json({
      ok: true,
      vendorId,
      timeline,
    });

  } catch (err) {
    console.error("[vendor/timeline] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
