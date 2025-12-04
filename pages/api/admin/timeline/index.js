// pages/api/admin/timeline/index.js
import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const rows = await sql`
      SELECT 
        vt.vendor_id,
        v.name AS vendor_name,
        vt.action,
        vt.message,
        vt.severity,
        vt.created_at
      FROM vendor_timeline vt
      LEFT JOIN vendors v ON v.id = vt.vendor_id
      ORDER BY vt.created_at DESC
      LIMIT 100;
    `;

    return res.status(200).json({
      ok: true,
      timeline: rows,
    });
  } catch (err) {
    console.error("[ADMIN TIMELINE ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
