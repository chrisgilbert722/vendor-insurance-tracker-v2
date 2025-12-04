// pages/api/renewals/log-v3.js
// Return all renewal_notifications for a single vendor

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { vendorId } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId in query.",
      });
    }

    const rows = await sql`
      SELECT 
        id,
        vendor_id,
        org_id,
        policy_id,
        days_left,
        sent_to,
        recipient_type,
        notification_type,
        subject,
        body,
        status,
        created_at
      FROM renewal_notifications
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC;
    `;

    return res.status(200).json({
      ok: true,
      vendorId,
      notifications: rows,
    });
  } catch (err) {
    console.error("[renewals/log-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load renewal log.",
    });
  }
}
