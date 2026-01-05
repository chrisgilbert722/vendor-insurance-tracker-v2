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
    const supabase = supabaseServer();

    // 🔐 Get authenticated user
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(req.headers.authorization?.replace("Bearer ", ""));

    if (userErr || !user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    // 🔐 Resolve org via membership (SOURCE OF TRUTH)
    const { data: orgRow, error: orgErr } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (orgErr || !orgRow?.org_id) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for authenticated user",
      });
    }

    const orgId = orgRow.org_id;

    // 📦 Parse upload
    const form = formidable({ multiples: false });
    const [_, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    // 📁 Upload to Supabase Storage
    const bucket = "vendor-uploads"; // CONFIRMED EXISTS
    const filename = `${orgId}/${Date.now()}-${file.originalFilename}`;
    const stream = fs.createReadStream(file.filepath);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, stream, {
        contentType: file.mimetype || "text/csv",
        duplex: "half",
      });

    if (uploadError) throw uploadError;

    // 🧾 Insert metadata (FK SAFE)
    const { error: dbError } = await supabase.from("vendor_uploads").insert({
      org_id: orgId,
      file_path: filename,
      original_name: file.originalFilename,
      mime_type: file.mimetype,
      size_bytes: file.size,
      created_by: user.id,
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
