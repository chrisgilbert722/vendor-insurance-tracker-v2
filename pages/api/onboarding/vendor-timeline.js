// pages/api/onboarding/vendor-timeline.js
// ==========================================================
// SINGLE VENDOR TIMELINE ENDPOINT (Step 4)
// Returns chronological onboarding events for the vendor.
// ==========================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const vendorId = req.query.vendorId;

    if (!vendorId) {
      return res.status(400).json({
        ok: false,
        error: "vendorId is required.",
      });
    }

    // Fetch timeline entries for this vendor
    const rows = await sql`
      SELECT
        id,
        vendor_id,
        org_id,
        action,
        message,
        severity,
        created_at
      FROM system_timeline
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC;
    `;

    return res.status(200).json({
      ok: true,
      events: rows,
    });
  } catch (err) {
    console.error("[vendor-timeline ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
