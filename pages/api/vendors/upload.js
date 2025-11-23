// pages/api/vendors/upload.js
import { sql } from "../../../lib/db";
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const token = fields.token?.[0];
    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ ok: false, error: "File upload missing" });
    }

    // --- Validate PDF ---
    const pdfBuffer = fs.readFileSync(file.filepath);
    const pdfData = await pdfParse(pdfBuffer);

    // --- Lookup vendor by upload token ---
    const vendors = await sql`
      SELECT id, name, upload_token_expires_at
      FROM vendors
      WHERE upload_token = ${token}
      LIMIT 1;
    `;

    if (vendors.length === 0) {
      return res.status(400).json({ ok: false, error: "Invalid token" });
    }

    const vendor = vendors[0];

    const now = new Date();
    const expires = new Date(vendor.upload_token_expires_at);

    if (now > expires) {
      return res.status(400).json({ ok: false, error: "Upload link expired" });
    }

    // --- Save certificate record ---
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
        ${pdfData.text}
      )
      RETURNING id, vendor_id, file_name;
    `;

    const cert = certRows[0];

    return res.status(200).json({
      ok: true,
      certificate: {
        id: cert.id,
        vendor_id: cert.vendor_id,
        file_name: cert.file_name
      }
    });

  } catch (err) {
    console.error("[api/vendors/upload] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
