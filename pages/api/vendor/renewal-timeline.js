// pages/api/vendor/renewal-timeline.js
// ==========================================================
// Vendor Renewal Timeline API
// Returns renewal/SLA/escalation events for a given vendor.
// ==========================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({ ok: false, error: "vendorId is required" });
    }

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
        AND action IN (
          'sla_90_day',
          'sla_30_day',
          'sla_7_day',
          'sla_3_day',
          'sla_expired',
          'sla_missing',
          'renewal_email_ai_v3',
          'broker_escalation',
          'internal_escalation',
          'termination_warning'
        )
      ORDER BY created_at ASC;
    `;

    return res.status(200).json({
      ok: true,
      events: rows || [],
    });
  } catch (err) {
    console.error("[RENEWAL TIMELINE API ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error",
    });
  }
}
