// pages/api/vendor/documents.js
// Vendor Portal V6 — Returns all uploaded documents for a vendor
// Supports:
// ✔ Secure vendor token
// ✔ Expiration checking
// ✔ Multi-document support (W9, License, Contract, Other)
// ✔ AI summaries (from vendor_documents.ai_json)
// ✔ Ordered newest → oldest

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    // ---------------------------------------------------------
    // 1) Resolve vendor + org from vendor_portal_tokens
    // ---------------------------------------------------------
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

    // Token expired?
    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({ ok: false, error: "Vendor link expired." });
    }

    // ---------------------------------------------------------
    // 2) Load vendor documents (NEW SCHEMA, V6)
    // ---------------------------------------------------------
    const docs = await sql`
      SELECT
        id,
        document_type,
        file_url,
        ai_json,
        uploaded_at
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
      ORDER BY uploaded_at DESC;
    `;

    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      documents: docs || [],
    });

  } catch (err) {
    console.error("[vendor/documents] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load documents.",
    });
  }
}
