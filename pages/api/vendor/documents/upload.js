// pages/api/vendor/documents/upload.js
// ============================================================
// Vendor Document Upload — V5 (Server-side)
// Handles file save + DB insert + returns document
// ============================================================

import fs from "fs";
import path from "path";
import formidable from "formidable";
import { sql } from "../../../../lib/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

function getStatus(expiresOn) {
  if (!expiresOn) return "valid";
  const days = (new Date(expiresOn) - new Date()) / 86400000;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { orgId, vendorId } = req.query;
  if (!orgId || !vendorId) {
    return res.status(400).json({ ok: false, error: "Missing orgId or vendorId" });
  }

  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    const documentType = fields.documentType?.[0] || "other";
    const expiresOn = fields.expiresOn?.[0] || null;

    const fileName = file.originalFilename;
    const fileUrl = `/uploads/${path.basename(file.filepath)}`;
    const status = getStatus(expiresOn);

    const [doc] = await sql`
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
        ${expiresOn},
        ${status}
      )
      RETURNING *
    `;

    return res.status(200).json({ ok: true, document: doc });
  } catch (err) {
    console.error("[upload.js]", err);
    return res.status(500).json({
      ok: false,
      error: "Upload failed",
    });
  }
}
