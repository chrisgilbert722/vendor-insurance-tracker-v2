// pages/api/alerts-v2/request-coi.js
// A4 — Request COI automation (SCHEMA-SAFE)

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

    // 1️⃣ Load alert (schema-safe)
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

    // 2️⃣ Load vendor
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

    // 3️⃣ Create vendor portal link
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
    if (!portalJson?.ok) {
      throw new Error("Failed to create vendor portal link");
    }

    const portalUrl = `${process.env.APP_URL}/vendor/portal/${portalJson.token}`;

    // 4️⃣ Send email (existing, proven path)
    const emailRes = await fetch(
      `${process.env.APP_URL}/api/vendor-portal/send-fix-email`,
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

    // 5️⃣ Done — do NOT mutate alerts_v2
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
