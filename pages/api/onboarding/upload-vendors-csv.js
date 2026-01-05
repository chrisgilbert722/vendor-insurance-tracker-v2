// pages/api/onboarding/upload-vendors-csv.js
import formidable from "formidable";
import fs from "fs";
import { supabaseServer } from "../../../lib/supabaseServer";

export const config = {
  api: { bodyParser: false },
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

    const orgId = Array.isArray(fields.orgId)
      ? fields.orgId[0]
      : fields.orgId;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId (must be orgs.id UUID)",
      });
    }

    const supabase = supabaseServer();

    // ✅ HARD VALIDATION — this is what you were missing
    const { data: org, error: orgError } = await supabase
      .from("orgs")
      .select("id")
      .eq("id", orgId)
      .single();

    if (orgError || !org) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for orgId",
      });
    }

    // ✅ CONFIRMED bucket name
    const bucket = "vendor-uploads";
    const filename = `${orgId}/${Date.now()}-${file.originalFilename}`;
    const stream = fs.createReadStream(file.filepath);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, stream, {
        contentType: file.mimetype || "text/csv",
        duplex: "half",
      });

    if (uploadError) throw uploadError;

    // ✅ FK-safe insert
    const { error: dbError } = await supabase
      .from("vendor_uploads")
      .insert({
        org_id: orgId,
        file_path: filename,
        original_name: file.originalFilename,
        mime_type: file.mimetype,
        size_bytes: file.size,
      });

    if (dbError) throw dbError;

    return res.status(200).json({
      ok: true,
      orgId,
      file: filename,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
