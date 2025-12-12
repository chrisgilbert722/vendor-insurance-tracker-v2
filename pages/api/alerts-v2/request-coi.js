// pages/api/alerts-v2/request-coi.js
// A4 — Request COI automation

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { alertId } = req.body;

    if (!alertId) {
      return res.status(400).json({
        ok: false,
        error: "Missing alertId",
      });
    }

    // 1. Load alert + vendor + org
    const [alert] = await sql`
      SELECT
        a.id,
        a.vendor_id,
        a.org_id,
        a.type,
        a.metadata,
        v.name AS vendor_name,
        v.email AS vendor_email
      FROM alerts_v2 a
      JOIN vendors v ON v.id = a.vendor_id
      WHERE a.id = ${alertId}
      LIMIT 1
    `;

    if (!alert) {
      return res.status(404).json({
        ok: false,
        error: "Alert not found",
      });
    }

    // 2. Create vendor portal token
    const portalRes = await fetch(
      `${process.env.APP_URL}/api/vendor/create-portal-link`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: alert.org_id,
          vendorId: alert.vendor_id,
        }),
      }
    );

    const portalJson = await portalRes.json();
    if (!portalJson.ok) {
      throw new Error("Failed to create vendor portal link");
    }

    const portalUrl = `${process.env.APP_URL}/vendor/portal/${portalJson.token}`;

    // 3. Send email to vendor
    await fetch(`${process.env.APP_URL}/api/vendor-portal/send-fix-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: alert.vendor_id,
        orgId: alert.org_id,
        email: alert.vendor_email,
        subject: "Action Required: Upload Updated COI",
        portalUrl,
        reason: alert.type,
        metadata: alert.metadata || {},
      }),
    });

    // 4. Update alert status
    await sql`
      UPDATE alerts_v2
      SET status = 'in_review',
          updated_at = now()
      WHERE id = ${alert.id}
    `;

    return res.status(200).json({
      ok: true,
      message: "COI request sent to vendor.",
      portalUrl,
    });
  } catch (err) {
    console.error("[alerts-v2/request-coi] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to request COI",
    });
  }
}
