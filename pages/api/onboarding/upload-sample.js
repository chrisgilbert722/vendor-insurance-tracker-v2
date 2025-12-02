// pages/api/onboarding/upload-sample.js
import formidable from "formidable";
import fs from "fs";
import { supabase } from "../../../lib/supabaseClient";

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    // Parse file upload
    const form = formidable({ multiples: false });

    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const fileBuffer = fs.readFileSync(file.filepath);

    const ext = file.originalFilename.split(".").pop().toLowerCase();
    if (ext !== "pdf") {
      return res.status(400).json({ ok: false, error: "Only PDF files allowed." });
    }

    const fileName = `sample-coi-${Date.now()}.pdf`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      console.error("[upload-sample] Upload error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    return res.status(200).json({
      ok: true,
      fileUrl: urlData.publicUrl,
    });
  } catch (err) {
    console.error("[upload-sample] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
