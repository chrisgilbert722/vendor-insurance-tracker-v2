// pages/api/vendor/upload-coi.js
import formidable from "formidable";
import fs from "fs";
import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const form = formidable({ multiples: false });

    const [fields, files] = await form.parse(req);
    const token = fields.token?.[0];
    const file = files.file?.[0];

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }
    if (!file.originalFilename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ ok: false, error: "Only PDF files allowed." });
    }

    // Validate vendor magic-link
    const rows = await sql`
      SELECT id, org_id, name
      FROM vendors
      WHERE magic_link_token = ${token}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Invalid vendor access link." });
    }

    const vendor = rows[0];

    // Upload PDF to Supabase storage
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `vendor-coi-${vendor.id}-${Date.now()}.pdf`;

    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // Save COI metadata (replace with policies table later)
    await sql`
      UPDATE vendors
      SET last_uploaded_coi = ${fileUrl},
          last_uploaded_at = NOW()
      WHERE id = ${vendor.id};
    `;

    return res.status(200).json({
      ok: true,
      fileUrl,
    });
  } catch (err) {
    console.error("[vendor/upload-coi] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
