// pages/api/onboarding/upload-vendors-csv.js
// Vendor CSV Upload → Supabase Storage (Vendor Uploads Bucket)

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
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    // Support both file and file[] shapes
    const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!rawFile) {
      return res.status(400).json({
        ok: false,
        error: "No file uploaded (expected field: file).",
      });
    }

    const orgId =
      (Array.isArray(fields.orgId) ? fields.orgId[0] : fields.orgId) ||
      "unknown";

    // ✅ CORRECT BUCKET NAME (matches Supabase exactly)
    const bucket = "vendor-uploads";

    const originalName = rawFile.originalFilename || "vendors.csv";
    const timestamp = Date.now();

    const path = `vendors-csv/${orgId}/${timestamp}-${originalName}`
      .replace(/\s+/g, "_")
      .toLowerCase();

    const stream = fs.createReadStream(rawFile.filepath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, stream, {
        contentType: rawFile.mimetype || "text/csv",
        duplex: "half", // Required for Node streams
      });

    if (error) {
      console.error("[upload-vendors-csv] Supabase error:", error);
      return res.status(500).json({
        ok: false,
        error: error.message || "Storage upload failed.",
      });
    }

    return res.status(200).json({
      ok: true,
      bucket,
      path: data?.path || path,
      orgId,
      originalName,
      size: rawFile.size,
    });
  } catch (err) {
    console.error("[upload-vendors-csv] handler error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed.",
    });
  }
}
