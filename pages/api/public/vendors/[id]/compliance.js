// pages/api/public/vendors/[id]/compliance.js
// ============================================================
// Public API — Vendor Compliance Status (Read-only)
// ============================================================

import { sql } from "lib/db";
import { requireApiKey } from "lib/apiAuth";

export default async function handler(req, res) {
  try {
    const orgId = await requireApiKey(req);
    const vendorId = parseInt(req.query.id, 10);

    if (!vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Invalid vendor id",
      });
    }

    const rows = await sql`
      SELECT
        v.id,
        v.vendor_name,
        v.status,
        COUNT(d.id) FILTER (WHERE d.status = 'expired') AS expired_docs,
        COUNT(d.id) FILTER (WHERE d.status = 'valid') AS valid_docs
      FROM vendors v
      LEFT JOIN vendor_documents d ON d.vendor_id = v.id
      WHERE v.org_id = ${orgId}
        AND v.id = ${vendorId}
      GROUP BY v.id
    `;

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found",
      });
    }

    return res.json({
      ok: true,
      compliance: rows[0],
    });
  } catch (err) {
    console.error("[public vendor compliance]", err);
    return res.status(401).json({
      ok: false,
      error: err.message,
    });
  }
}
