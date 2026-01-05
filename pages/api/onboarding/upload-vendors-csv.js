// pages/api/onboarding/upload-vendors-csv.js
// Vendor CSV Upload → Supabase Storage (vendor-uploads bucket)

import formidable from "formidable";
import fs from "fs";
import { supabaseServer } from "../../../lib/supabaseServer";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const orgId =
      Array.isArray(fields.orgId) ? fields.orgId[0] : fields.orgId;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const supabase = supabaseServer(); // ✅ SERVICE ROLE CLIENT

    const bucket = "vendor-uploads"; // ✅ matches Supabase UI exactly
    const filename = `${orgId}/${Date.now()}-${file.originalFilename}`
      .replace(/\s+/g, "_")
      .toLowerCase();

    const stream = fs.createReadStream(file.filepath);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, stream, {
        contentType: file.mimetype || "text/csv",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload failed:", uploadError);
      throw uploadError;
    }

    // ✅ Insert metadata using service role (bypasses RLS safely)
    const { error: dbError } = await supabase.from("vendor_uploads").insert({
      org_id: orgId,
      file_path: filename,
      original_name: file.originalFilename,
      mime_type: file.mimetype,
      size_bytes: file.size,
    });

    if (dbError) {
      console.error("DB insert failed:", dbError);
      throw dbError;
    }

    return res.status(200).json({
      ok: true,
      bucket,
      path: filename,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Upload failed" });
  }
}
