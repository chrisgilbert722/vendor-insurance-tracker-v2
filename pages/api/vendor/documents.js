// pages/api/vendor/documents.js
// Returns all vendor documents for Vendor Portal V6

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    // Lookup vendorId + orgId from token
    const tokenRows = await sql`
      SELECT vendor_id, org_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (!tokenRows.length) {
      return res.status(404).json({ ok: false, error: "Invalid vendor token" });
    }

    const { vendor_id: vendorId, org_id: orgId, expires_at } = tokenRows[0];

    // Expired?
    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({
        ok: false,
        error: "Vendor link expired.",
      });
    }

    const docs = await sql`
      SELECT id, document_type, file_url, ai_json, uploaded_at
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
      ORDER BY uploaded_at DESC;
    `;

    return res.status(200).json({
      ok: true,
      documents: docs,
    });
  } catch (err) {
    console.error("[vendor/documents] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load documents.",
    });
  }
}
