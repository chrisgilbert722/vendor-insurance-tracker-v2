// pages/api/onboarding/upload-contract.js
// Upload contract / endorsement / COI PDFs to Supabase Storage (Onboarding bucket)

import formidable from "formidable";
import fs from "fs";
import { supabaseServer } from "../../../lib/supabaseServer";

export const config = {
  api: {
    bodyParser: false, // Required for Formidable
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
    return res.status(405).json({
      ok: false,
      error: "Use POST for this endpoint.",
    });
  }

  try {
    const supabase = supabaseServer();

    const { fields, files } = await parseForm(req);

    // Expecting file or file[]
    const rawFile = Array.isArray(files.file)
      ? files.file[0]
      : files.file;

    if (!rawFile) {
      return res.status(400).json({
        ok: false,
        error: "No PDF uploaded (expected field 'file')",
      });
    }

    const orgId =
      Array.isArray(fields.orgId)
        ? fields.orgId[0]
        : fields.orgId || "unknown";

    const bucket = "onboarding";

    const originalName = rawFile.originalFilename || "contract.pdf";
    const timestamp = Date.now();

    const cleanName = originalName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    const storagePath = `contracts/${orgId}/${timestamp}-${cleanName}`;

    // Read file as buffer (Node-safe, Supabase-safe)
    const buffer = fs.readFileSync(rawFile.filepath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: rawFile.mimetype || "application/pdf",
        upsert: false,
      });

    if (error) {
      console.error("[upload-contract] Supabase error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Upload failed.",
      });
    }

    return res.status(200).json({
      ok: true,
      bucket,
      path: data?.path || storagePath,
      orgId,
      originalName,
      size: rawFile.size,
    });
  } catch (err) {
    console.error("[upload-contract] Unexpected error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Unexpected server error.",
    });
  }
}
