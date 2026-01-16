// pages/api/alerts-v2/request-coi.js
// A4 — Request COI automation (HARDENED, SCHEMA-SAFE, INTERNAL-SAFE)

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { alertId } = req.body || {};

    if (!alertId) {
      return res.status(400).json({
        ok: false,
        error: "Missing alertId",
      });
    }

    /* -------------------------------------------------
       Resolve base URL SAFELY (no env var dependency)
    -------------------------------------------------- */
    const baseUrl =
      req.headers.origin ||
      `https://${req.headers.host}`;

    /* -------------------------------------------------
       1. Load alert (ONLY real columns)
    -------------------------------------------------- */
    const [alert] = await sql`
      SELECT id, vendor_id, org_id, type
      FROM alerts_v2
      WHERE id = ${alertId}
      LIMIT 1;
    `;

    if (!alert) {
      return res.status(404).json({
        ok: false,
        error: "Alert not found",
      });
    }

    /* -------------------------------------------------
       2. Load vendor
    -------------------------------------------------- */
    const [vendor] = await sql`
      SELECT id, name, email
      FROM vendors
      WHERE id = ${alert.vendor_id}
      LIMIT 1;
    `;

    if (!vendor) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found for alert",
      });
    }

    if (!vendor.email) {
      return res.status(400).json({
        ok: false,
        error: "Vendor has no email on file",
      });
    }

    /* -------------------------------------------------
       3. Create vendor portal link (INTERNAL SAFE)
    -------------------------------------------------- */
    const portalRes = await fetch(
      `${baseUrl}/api/vendor/create-portal-link`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: alert.org_id,
          vendorId: alert.vendor_id,
        }),
      }
    );

    if (!portalRes.ok) {
      const txt = await portalRes.text();
      throw new Error(`Portal link service failed: ${txt}`);
    }

    const portalJson = await portalRes.json();

    if (!portalJson?.ok || !portalJson?.token) {
      throw new Error("Invalid response from portal link service");
    }

    const portalUrl = `${baseUrl}/vendor/portal/${portalJson.token}`;

    /* -------------------------------------------------
       4. Send email (existing, proven path)
    -------------------------------------------------- */
    const emailRes = await fetch(
      `${baseUrl}/api/vendor-portal/send-fix-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          orgId: alert.org_id,
          subject: "Action Required: Upload Updated COI",
          body: `
Hello ${vendor.name},

Please upload an updated Certificate of Insurance.

Upload here:
${portalUrl}

Thank you,
Compliance Team
          `.trim(),
        }),
      }
    );

    if (!emailRes.ok) {
      const txt = await emailRes.text();
      throw new Error(`Failed to send COI request email: ${txt}`);
    }

    /* -------------------------------------------------
       5. Success — NO alert mutation here
    -------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      sentTo: vendor.email,
      portalUrl,
    });
  } catch (err) {
    console.error("[alerts-v2/request-coi]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to request COI",
    });
  }
}
