// pages/api/vendors/upload.js
// ============================================================
// VENDOR UPLOAD API — Accepts uploads via token (no auth required)
// Token-based authentication for vendor portal uploads
// ============================================================

import { sql } from "@db";
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const token = fields.token?.[0];
    if (!token) {
      return res.status(400).json({
        ok: false,
        error: "Missing upload token",
      });
    }

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({
        ok: false,
        error: "File upload missing",
      });
    }

    /* ------------------------------------------------------------
       LOOKUP VENDOR BY TOKEN (token is scoped to vendor+org)
       No auth session required - token IS the authentication
    ------------------------------------------------------------ */
    const vendors = await sql`
      SELECT id, name, org_id, upload_token_expires_at
      FROM vendors
      WHERE upload_token = ${token}
      LIMIT 1;
    `;

    if (vendors.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid or expired upload token",
      });
    }

    const vendor = vendors[0];

    const now = new Date();
    const expires = new Date(vendor.upload_token_expires_at);

    if (now > expires) {
      return res.status(400).json({
        ok: false,
        error: "Upload link expired. Please request a new link.",
      });
    }

    /* ------------------------------------------------------------
       PARSE FILE (PDF or image)
    ------------------------------------------------------------ */
    const fileBuffer = fs.readFileSync(file.filepath);
    let parsedText = null;

    // Only parse PDFs for text extraction
    if (file.mimetype === "application/pdf") {
      try {
        const pdfData = await pdfParse(fileBuffer);
        parsedText = pdfData.text;
      } catch (pdfErr) {
        console.warn("[vendors/upload] PDF parse warning:", pdfErr.message);
        // Continue without parsed text - it's optional
      }
    }

    /* ------------------------------------------------------------
       SAVE CERTIFICATE
    ------------------------------------------------------------ */
    const certRows = await sql`
      INSERT INTO certificates (
        vendor_id,
        file_name,
        mime_type,
        file_size,
        parsed_text
      )
      VALUES (
        ${vendor.id},
        ${file.originalFilename},
        ${file.mimetype},
        ${file.size},
        ${parsedText}
      )
      RETURNING id, vendor_id, file_name;
    `;

    const cert = certRows[0];

    return res.status(200).json({
      ok: true,
      certificate: {
        id: cert.id,
        vendor_id: cert.vendor_id,
        file_name: cert.file_name,
      },
    });
  } catch (err) {
    console.error("[api/vendors/upload] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
