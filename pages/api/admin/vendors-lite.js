// pages/api/admin/vendors-lite.js
// ============================================================
// Admin — Vendors Lite (for Audit Log filter dropdown)
// ============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const { orgId } = req.query;
    if (!orgId) return res.status(400).json({ ok: false, error: "Missing orgId" });

    const rows = await sql`
      SELECT id, vendor_name
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY vendor_name ASC
      LIMIT 5000
    `;

    return res.status(200).json({ ok: true, vendors: rows || [] });
  } catch (err) {
    console.error("[vendors-lite]", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
}
