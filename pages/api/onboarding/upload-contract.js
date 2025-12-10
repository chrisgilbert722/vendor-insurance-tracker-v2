// pages/api/onboarding/upload-contract.js
// Upload contract / endorsement / COI PDFs to Supabase Storage (Onboarding bucket)

import formidable from "formidable";
import fs from "fs";
import { supabase } from "../../../lib/supabaseClient";

export const config = {
  api: {
    bodyParser: false, // Required for Formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Use POST for this endpoint.",
    });
  }

  try {
    const form = formidable({ multiples: false });

    // Parse incoming multipart/form-data
    const [fields, files] = await form.parse(req);

    // Expecting file[] or file
    const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!rawFile) {
      return res.status(400).json({
        ok: false,
        error: "No PDF uploaded (expected field 'file')",
      });
    }

    const orgId =
      Array.isArray(fields.orgId) ? fields.orgId[0] : fields.orgId || "unknown";

    const bucket = "onboarding"; // You can change this if needed

    const originalName = rawFile.originalFilename || "contract.pdf";
    const timestamp = Date.now();

    // Normalize filename
    const cleanName = originalName
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    const storagePath = `contracts/${orgId}/${timestamp}-${cleanName}`;

    // Create a readable stream from the uploaded file temp path
    const fileStream = fs.createReadStream(rawFile.filepath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileStream, {
        contentType: rawFile.mimetype || "application/pdf",
        duplex: "half", // Required for streaming uploads on Node
      });

    if (error) {
      console.error("[upload-contract] Supabase error:", error);
      return res
        .status(500)
        .json({ ok: false, error: error.message || "Upload failed." });
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
