// pages/api/vendor/documents/upload.js
// ============================================================
// Vendor Document Upload — V5 (Production Ready)
// Purpose:
//  - Register an uploaded document
//  - Compute document status (valid / expiring / expired)
//  - Insert vendor_documents row
//  - Auto-generate compliance alerts when needed
// ============================================================

import { sql } from "../../../../lib/db";

// -----------------------------
// Helpers
// -----------------------------
function getDocumentStatus(expiresOn) {
  if (!expiresOn) return "valid";

  const now = new Date();
  const exp = new Date(expiresOn);
  const days = (exp - now) / 86400000;

  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

async function createAlert({
  orgId,
  vendorId,
  documentId,
  type,
  severity,
  message
}) {
  await sql`
    INSERT INTO compliance_alerts (
      org_id,
      vendor_id,
      alert_type,
      document_id,
      severity,
      message
    )
    VALUES (
      ${orgId},
      ${vendorId},
      ${type},
      ${documentId},
      ${severity},
      ${message}
    )
  `;
}

// -----------------------------
// API Handler
// -----------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      orgId,
      vendorId,
      documentType,
      fileName,
      fileUrl,
      expiresOn
    } = req.body || {};

    // Hard guards
    if (!orgId || !vendorId || !documentType || !fileName || !fileUrl) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const status = getDocumentStatus(expiresOn);

    // Insert document
    const [document] = await sql`
      INSERT INTO vendor_documents (
        org_id,
        vendor_id,
        document_type,
        file_name,
        file_url,
        expires_on,
        status
      )
      VALUES (
        ${orgId},
        ${vendorId},
        ${documentType},
        ${fileName},
        ${fileUrl},
        ${expiresOn || null},
        ${status}
      )
      RETURNING *
    `;

    // Generate alerts based on status
    if (status === "expiring") {
      await createAlert({
        orgId,
        vendorId,
        documentId: document.id,
        type: "DOCUMENT_EXPIRING",
        severity: "warning",
        message: `${documentType} expires within 30 days`
      });
    }

    if (status === "expired") {
      await createAlert({
        orgId,
        vendorId,
        documentId: document.id,
        type: "DOCUMENT_EXPIRED",
        severity: "critical",
        message: `${documentType} is expired`
      });
    }

    return res.status(200).json({
      success: true,
      document
    });
  } catch (err) {
    console.error("Document upload error:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}
