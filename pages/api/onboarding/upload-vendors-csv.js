// pages/api/onboarding/upload-vendors-csv.js
// Vendor CSV Upload → Supabase Storage (Onboarding Bucket)
// ✅ FIXED: resolves real org_id before insert

import formidable from "formidable";
import fs from "fs";
import { supabaseServer } from "../../../lib/supabaseServer";
import { resolveOrg } from "../../../lib/resolveOrg";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  try {
    // 🔑 CRITICAL: resolve REAL org_id (orgs.id)
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Unable to resolve organization.",
      });
    }

    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const rawFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!rawFile) {
      return res.status(400).json({
        ok: false,
        error: "No file uploaded (expected field: file).",
      });
    }

    const supabase = supabaseServer();

    const originalName = rawFile.originalFilename || "vendors.csv";
    const timestamp = Date.now();
    const storagePath = `vendors-csv/${orgId}/${timestamp}-${originalName}`
      .replace(/\s+/g, "_")
      .toLowerCase();

    // Upload to storage
    const stream = fs.createReadStream(rawFile.filepath);

    const { error: storageError } = await supabase.storage
      .from("vendor-uploads")
      .upload(storagePath, stream, {
        contentType: rawFile.mimetype || "text/csv",
        duplex: "half",
        upsert: false,
      });

    if (storageError) {
      throw storageError;
    }

    // Insert metadata row (FK-safe)
    const { error: insertError } = await supabase
      .from("vendor_uploads")
      .insert({
        org_id: orgId,
        file_path: storagePath,
        original_name: originalName,
        mime_type: rawFile.mimetype || "text/csv",
        size_bytes: rawFile.size,
        created_by: null,
      });

    if (insertError) {
      throw insertError;
    }

    return res.status(200).json({
      ok: true,
      orgId,
      path: storagePath,
      originalName,
      size: rawFile.size,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed.",
    });
  }
}
