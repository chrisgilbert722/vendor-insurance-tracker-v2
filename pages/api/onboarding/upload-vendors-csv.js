import formidable from "formidable";
import fs from "fs";
import { supabaseServer } from "../../../lib/supabaseServer";

export const config = {
  api: { bodyParser: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    // ---- File guard
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({
        ok: false,
        error: "No file uploaded (expected field: file)",
      });
    }

    // ---- orgId guard
    const orgId = Array.isArray(fields.orgId)
      ? fields.orgId[0]
      : fields.orgId;

    if (!orgId || !UUID_RE.test(orgId)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid orgId (must be orgs.id UUID)",
      });
    }

    const supabase = supabaseServer();

    // ---- Verify org exists (FK safety)
    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .select("id")
      .eq("id", orgId)
      .single();

    if (orgErr || !org) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for orgId",
      });
    }

    // ---- Storage upload
    const bucket = "vendor-uploads"; // ✅ confirmed bucket
    const safeName = (file.originalFilename || "vendors.csv")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    const filename = `${orgId}/${Date.now()}-${safeName}`;
    const stream = fs.createReadStream(file.filepath);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, stream, {
        contentType: file.mimetype || "text/csv",
        duplex: "half",
      });

    if (uploadError) {
      console.error("[storage upload]", uploadError);
      throw uploadError;
    }

    // ---- Insert metadata (FK-safe now)
    const { error: dbError } = await supabase
      .from("vendor_uploads")
      .insert({
        org_id: orgId,
        file_path: filename,
        original_name: file.originalFilename,
        mime_type: file.mimetype,
        size_bytes: file.size,
      });

    if (dbError) {
      console.error("[vendor_uploads insert]", dbError);
      throw dbError;
    }

    return res.status(200).json({
      ok: true,
      orgId,
      file: filename,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}
