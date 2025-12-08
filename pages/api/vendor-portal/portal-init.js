// pages/api/vendor/portal-init.js
// ==========================================================
// Vendor Portal V3 — INIT ENDPOINT
// Validates token + returns vendor + requirements + alerts.
// ==========================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token." });
    }

    // 1) Look up token
    const tokens = await sql`
      SELECT vendor_id, org_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1;
    `;

    if (tokens.length === 0) {
      return res.status(404).json({ ok: false, error: "Invalid or unknown link." });
    }

    const t = tokens[0];

    if (t.expires_at && new Date(t.expires_at) < new Date()) {
      return res.status(410).json({ ok: false, error: "This link has expired." });
    }

    // 2) Load vendor
    const vendors = await sql`
      SELECT
        id,
        org_id,
        vendor_name,
        email,
        phone,
        work_type,
        address,
        requirements_json,
        last_uploaded_coi,
        last_uploaded_at
      FROM vendors
      WHERE id = ${t.vendor_id}
      LIMIT 1;
    `;

    if (vendors.length === 0) {
      return res.status(404).json({ ok: false, error: "Vendor not found." });
    }

    const vendor = vendors[0];

    // 3) Load open alerts (if any)
    const alerts = await sql`
      SELECT
        id,
        severity,
        type,
        title,
        message,
        status
      FROM alerts
      WHERE vendor_id = ${vendor.id}
        AND status = 'Open';
    `;

    const hasCriticalAlerts = alerts.some(
      (a) => (a.severity || "").toLowerCase() === "critical"
    );

    const summary = {
      openAlertCount: alerts.length,
      hasCriticalAlerts,
    };

    return res.status(200).json({
      ok: true,
      vendor,
      orgId: vendor.org_id,
      requirements: vendor.requirements_json || null,
      alerts,
      summary,
    });
  } catch (err) {
    console.error("[portal-init ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
