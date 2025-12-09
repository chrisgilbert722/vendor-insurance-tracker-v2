// pages/api/onboarding/upload-vendors-csv.js
// Vendor CSV Upload → Supabase Storage (Onboarding Bucket)

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
      return res
        .status(400)
        .json({ ok: false, error: "No file uploaded (expected field: file)." });
    }

    const orgId =
      (Array.isArray(fields.orgId) ? fields.orgId[0] : fields.orgId) || "unknown";

    const bucket = "onboarding"; // adjust to your real bucket name if different
    const originalName = rawFile.originalFilename || "vendors.csv";
    const ext =
      (originalName.includes(".")
        ? originalName.split(".").pop()
        : "csv") || "csv";

    const timestamp = Date.now();
    const path = `vendors-csv/${orgId}/${timestamp}-${originalName}`
      .replace(/\s+/g, "_")
      .toLowerCase();

    const stream = fs.createReadStream(rawFile.filepath);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, stream, {
        contentType: rawFile.mimetype || "text/csv",
        duplex: "half", // required for Node streams in some environments
      });

    if (error) {
      console.error("[upload-vendors-csv] Supabase error:", error);
      throw error;
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
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Upload failed." });
  }
}
