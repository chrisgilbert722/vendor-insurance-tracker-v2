// pages/api/vendor/portal/[token].js
// Vendor Portal Resolver — returns vendor+status info from a secure token

import { sql } from "../../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    // 1) Find token entry
    const rows = await sql`
      SELECT org_id, vendor_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Invalid or unknown link." });
    }

    const entry = rows[0];

    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
      return res.status(410).json({ ok: false, error: "This link has expired." });
    }

    const orgId = entry.org_id;
    const vendorId = entry.vendor_id;

    // 2) Load vendor
    const vendorRows = await sql`
      SELECT id, vendor_name, email, category
      FROM vendors
      WHERE id = ${vendorId} AND org_id = ${orgId}
      LIMIT 1
    `;

    if (!vendorRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found.",
      });
    }

    const vendor = vendorRows[0];

    // 3) Load active policies
    const policyRows = await sql`
      SELECT id, policy_number, carrier, coverage_type, expiration_date
      FROM policies
      WHERE vendor_id = ${vendorId}
      ORDER BY expiration_date DESC
    `;

    // 4) Load recent alerts
    const alertRows = await sql`
      SELECT code, message, severity, created_at
      FROM vendor_alerts
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Mark last access (optional)
    await sql`
      UPDATE vendor_portal_tokens
      SET used_at = NOW()
      WHERE token = ${token}
    `;

    return res.status(200).json({
      ok: true,
      orgId,
      vendorId,
      vendor,
      policies: policyRows,
      alerts: alertRows,
    });
  } catch (err) {
    console.error("[vendor/portal] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load vendor portal data.",
    });
  }
}
