// pages/api/onboarding/upload-sample.js
import formidable from "formidable";
import fs from "fs";
import { supabaseServer } from "../../../lib/supabaseServer";

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

// Proper Promise wrapper for formidable
function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const supabase = supabaseServer();

    const { fields, files } = await parseForm(req);

    const file = Array.isArray(files.file)
      ? files.file[0]
      : files.file;

    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const ext = file.originalFilename.split(".").pop().toLowerCase();
    if (ext !== "pdf") {
      return res.status(400).json({
        ok: false,
        error: "Only PDF files allowed.",
      });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `sample-coi-${Date.now()}.pdf`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
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
