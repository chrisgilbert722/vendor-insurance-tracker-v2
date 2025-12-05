// pages/api/vendor/create-portal-link.js
// Admin API — create a secure vendor portal link token

import { sql } from "../../../lib/db";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, vendorId } = req.body || {};

    if (!orgId || !vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or vendorId.",
      });
    }

    // Optional: expire after 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const token = crypto.randomBytes(32).toString("hex");

    await sql`
      INSERT INTO vendor_portal_tokens (org_id, vendor_id, token, expires_at)
      VALUES (${orgId}, ${vendorId}, ${token}, ${expiresAt.toISOString()})
    `;

    // You can build full URL in the frontend, e.g.:
    // `${window.location.origin}/vendor/portal/${token}`

    return res.status(200).json({
      ok: true,
      token,
      message: "Vendor portal link created.",
    });
  } catch (err) {
    console.error("[create-portal-link] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to create vendor portal link.",
    });
  }
}
