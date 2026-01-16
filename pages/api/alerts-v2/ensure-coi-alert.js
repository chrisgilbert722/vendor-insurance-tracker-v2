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
    // --------------------------------------------------
    // 1. Resolve vendor UUID (TEXT → UUID SAFE)
    // --------------------------------------------------
    const vendorRes = await sql`
      SELECT external_uuid::uuid AS vendor_uuid
      FROM vendors
      WHERE id = ${vendorId}
        AND org_id = ${orgId}
      LIMIT 1;
    `;

    if (!vendorRes.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found",
      });
    }

    const vendorUuid = vendorRes[0].vendor_uuid;

    // --------------------------------------------------
    // 2. Reuse existing open COI alert
    // --------------------------------------------------
    const existing = await sql`
      SELECT id
      FROM alerts_v2
      WHERE vendor_id = ${vendorUuid}
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

    // --------------------------------------------------
    // 3. Create COI alert (UUID SAFE)
    // --------------------------------------------------
    const created = await sql`
      INSERT INTO alerts_v2 (
        org_id,
        vendor_id,
        type,
        severity,
        status,
        source,
        title,
        message,
        created_at,
        updated_at
      )
      VALUES (
        ${orgId},
        ${vendorUuid},
        'coi_missing',
        'medium',
        'open',
        'manual_request',
        'COI Requested',
        'A certificate of insurance has been requested from this vendor.',
        NOW(),
        NOW()
      )
      RETURNING id;
    `;

    return res.status(200).json({
      ok: true,
      alertId: created[0].id,
      reused: false,
    });
  } catch (err) {
    console.error("[ensure-coi-alert] FATAL:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to ensure COI alert",
    });
  }
}
