// pages/api/alerts-v2/ensure-coi-alert.js
import { sql } from "../../../lib/db";
import { logTimelineEvent, TIMELINE_EVENTS } from "../../../lib/timeline";

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
    // 1️⃣ Check for existing unresolved COI alert
    const existing = await sql`
      SELECT id
      FROM alerts_v2
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
        AND type = 'coi_missing'
        AND resolved_at IS NULL
      LIMIT 1;
    `;

    if (existing.length > 0) {
      return res.status(200).json({
        ok: true,
        alertId: existing[0].id,
        reused: true,
      });
    }

    // 2️⃣ Create new COI alert (MATCHES REAL SCHEMA)
    const created = await sql`
      INSERT INTO alerts_v2 (
        org_id,
        vendor_id,
        type,
        severity,
        message
      )
      VALUES (
        ${orgId},
        ${vendorId},
        'coi_missing',
        'medium',
        'Certificate of Insurance requested from vendor'
      )
      RETURNING id;
    `;

    // Log to timeline for audit trail
    await logTimelineEvent({
      vendorId,
      action: TIMELINE_EVENTS.ALERT_CREATED,
      message: "COI missing alert created",
      severity: "warning",
    });

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
