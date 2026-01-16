// pages/api/alerts-v2/request-coi.js
// A4 — Request COI automation (SCHEMA-SAFE + GUARDED)

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    /* -------------------------------------------------
       🔒 HARD ENV GUARD (PREVENTS undefined/api/*)
    -------------------------------------------------- */
    const APP_URL = process.env.APP_URL;

    if (!APP_URL || !APP_URL.startsWith("http")) {
      console.error("[request-coi] APP_URL missing or invalid:", APP_URL);
      return res.status(500).json({
        ok: false,
        error: "Server misconfigured (APP_URL missing)",
      });
    }

    const { alertId } = req.body;

    if (!alertId) {
      return res.status(400).json({
        ok: false,
        error: "Missing alertId",
      });
    }

    /* -------------------------------------------------
       1️⃣ Load alert (schema-safe)
    -------------------------------------------------- */
    const [alert] = await sql`
      SELECT
        id,
        vendor_id,
        org_id,
        type
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
       2️⃣ Load vendor
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
       3️⃣ Create vendor portal link
    -------------------------------------------------- */
    const portalRes = await fetch(
      `${APP_URL}/api/vendor/create-portal-link`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: alert.org_id,
          vendorId: alert.vendor_id,
        }),
      }
    );

    let portalJson;
    try {
      portalJson = await portalRes.json();
    } catch {
      throw new Error("Invalid response from portal link service");
    }

    if (!portalRes.ok || !portalJson?.ok || !portalJson?.token) {
      throw new Error("Failed to create vendor portal link");
    }

    const portalUrl = `${APP_URL}/vendor/portal/${portalJson.token}`;

    /* -------------------------------------------------
       4️⃣ Send email (existing, proven path)
    -------------------------------------------------- */
    const emailRes = await fetch(
      `${APP_URL}/api/vendor-portal/send-fix-email`,
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
      throw new Error("Failed to send COI request email");
    }

    /* -------------------------------------------------
       5️⃣ DONE — NO alerts_v2 mutation (by design)
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
