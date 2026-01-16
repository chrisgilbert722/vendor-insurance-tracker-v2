// pages/api/alerts-v2/request-coi.js
// A4 — Request COI automation (FINAL — INLINE TOKEN + CORRECT EMAIL ROUTE)

import { sql } from "../../../lib/db";
import crypto from "crypto";

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
       1. Load alert
    -------------------------------------------------- */
    const [alert] = await sql`
      SELECT id, vendor_id, org_id
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
        error: "Vendor not found",
      });
    }

    if (!vendor.email) {
      return res.status(400).json({
        ok: false,
        error: "Vendor has no email on file",
      });
    }

    /* -------------------------------------------------
       3. Create portal token INLINE (NO API HOPS)
    -------------------------------------------------- */
    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await sql`
      INSERT INTO vendor_portal_tokens (org_id, vendor_id, token, expires_at)
      VALUES (${alert.org_id}, ${vendor.id}, ${token}, ${expiresAt})
    `;

    const origin =
      req.headers.origin ||
      process.env.APP_URL ||
      `https://${req.headers.host}`;

    const portalUrl = `${origin}/vendor/portal/${token}`;

    /* -------------------------------------------------
       4. SEND EMAIL — ✅ CORRECT ROUTE
    -------------------------------------------------- */
    const emailRes = await fetch(
      `${origin}/api/vendor/send-fix-email`,
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
      throw new Error(`Email API failed: ${txt}`);
    }

    /* -------------------------------------------------
       5. SUCCESS
    -------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      sentTo: vendor.email,
      portalUrl,
    });
  } catch (err) {
    console.error("[request-coi]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to request COI",
    });
  }
}
