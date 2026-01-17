// pages/api/vendors/validate-token.js
// ============================================================
// VALIDATE VENDOR UPLOAD TOKEN — Public endpoint
// Validates token and returns vendor info (no auth required)
// ============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      ok: false,
      error: "Missing upload token",
    });
  }

  try {
    // Look up vendor by token
    const rows = await sql`
      SELECT
        v.id,
        v.name,
        v.email,
        v.upload_token_expires_at,
        o.name as org_name
      FROM vendors v
      JOIN orgs o ON o.id = v.org_id
      WHERE v.upload_token = ${token}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid upload token. Please request a new link from your administrator.",
      });
    }

    const vendor = rows[0];

    // Check expiration
    const now = new Date();
    const expires = new Date(vendor.upload_token_expires_at);

    if (now > expires) {
      return res.status(400).json({
        ok: false,
        error: "This upload link has expired. Please contact your administrator for a new link.",
      });
    }

    // Return vendor info (limited - no sensitive data)
    return res.status(200).json({
      ok: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        org_name: vendor.org_name,
        // Don't expose email or other sensitive info
      },
    });
  } catch (err) {
    console.error("[validate-token] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Unable to validate upload link. Please try again.",
    });
  }
}
