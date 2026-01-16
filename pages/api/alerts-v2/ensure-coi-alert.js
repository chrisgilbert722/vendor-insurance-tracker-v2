// pages/api/alerts-v2/ensure-coi-alert.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { vendorId, orgId } = req.body;

  if (!vendorId || !orgId) {
    return res.status(400).json({
      ok: false,
      error: "Missing vendorId or orgId",
    });
  }

  try {
    // 1. Look for existing open COI alert
    const existing = await sql`
      SELECT id
      FROM alerts_v2
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
        AND type = 'coi_missing'
        AND status = 'open'
      LIMIT 1;
    `;

    if (existing.length) {
      return res.status(200).json({
        ok: true,
        alertId: existing[0].id,
        reused: true,
      });
    }

    // 2. Create new alert
    const created = await sql`
      INSERT INTO alerts_v2 (
        org_id,
        vendor_id,
        type,
        severity,
        status,
        source
      )
      VALUES (
        ${orgId},
        ${vendorId},
        'coi_missing',
        'medium',
        'open',
        'manual_request'
      )
      RETURNING id;
    `;

    return res.status(200).json({
      ok: true,
      alertId: created[0].id,
      reused: false,
    });
  } catch (err) {
    console.error("[ensure-coi-alert]", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to ensure COI alert",
    });
  }
}
