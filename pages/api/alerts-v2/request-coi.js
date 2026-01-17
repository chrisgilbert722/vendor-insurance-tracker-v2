// pages/api/alerts-v2/request-coi.js
// A4 — Request COI automation (SINGLE OWNER, NO INTERNAL HOPS)
// - Loads alert + vendor from Neon
// - Creates vendor portal token directly
// - Sends email directly via Resend (manual operator action)
// - No trial/automation lock (this is NOT "automation", it's manual request)

import { sql } from "../../../lib/db";
import crypto from "crypto";
import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { alertId } = req.body || {};
    if (!alertId) {
      return res.status(400).json({ ok: false, error: "Missing alertId" });
    }

    // Resolve origin safely (works on Vercel + browser)
    const origin =
      req.headers.origin ||
      process.env.APP_URL ||
      (req.headers.host ? `https://${req.headers.host}` : null);

    if (!origin) {
      return res.status(500).json({
        ok: false,
        error: "Unable to resolve origin for portal URL",
      });
    }

    // 1) Load alert (schema-safe)
    const [alert] = await sql`
      SELECT id, vendor_id, org_id, type
      FROM alerts_v2
      WHERE id = ${alertId}
      LIMIT 1;
    `;

    if (!alert) {
      return res.status(404).json({ ok: false, error: "Alert not found" });
    }

    // 2) Load vendor (must have email)
    const [vendor] = await sql`
      SELECT id, name, email
      FROM vendors
      WHERE id = ${alert.vendor_id}
      LIMIT 1;
    `;

    if (!vendor) {
      return res.status(404).json({ ok: false, error: "Vendor not found" });
    }

    if (!vendor.email) {
      return res.status(400).json({ ok: false, error: "Vendor has no email on file" });
    }

    // 3) Create portal token directly (no API hop)
    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await sql`
      INSERT INTO vendor_portal_tokens (org_id, vendor_id, token, expires_at)
      VALUES (${alert.org_id}, ${vendor.id}, ${token}, ${expiresAt})
    `;

    // CRITICAL: Use /vendor-pages/portal/ path (matches actual page location)
    const portalUrl = `${origin}/vendor-pages/portal/${token}`;

    // 4) Send email directly via Resend (manual operator action)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "RESEND_API_KEY is not set",
      });
    }

    const resend = new Resend(apiKey);

    const from = process.env.EMAIL_FROM || "Compliance <no-reply@verivo.io>";
    const subject = "Action Required: Upload Updated COI";
    const body = `Hello ${vendor.name || "there"},

Please upload an updated Certificate of Insurance (COI).

Upload here:
${portalUrl}

Thank you,
Compliance Team`;

    await resend.emails.send({
      from,
      to: vendor.email,
      subject,
      text: body,
    });

    return res.status(200).json({
      ok: true,
      sentTo: vendor.email,
      portalUrl,
    });
  } catch (err) {
    console.error("[alerts-v2/request-coi] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Failed to request COI",
    });
  }
}
