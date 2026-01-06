// Vendor CSV Upload → Supabase Storage + Neon vendor_uploads
// ✅ MATCHES REAL SCHEMA
// ✅ NO cross-database joins
// ✅ NO fake columns

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: false },
};

// Supabase service role (storage + auth verify)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // 1️⃣ Auth check (Supabase)
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Authentication session missing. Please refresh.",
      });
    }

    const { data: userData, error: authErr } =
      await supabaseAdmin.auth.getUser(token);

    if (authErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = userData.user.id;

    // 2️⃣ Parse form
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
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // 3️⃣ Upload to Supabase Storage
    const bucket = "vendor-uploads";
    const safeName = (file.originalFilename || "vendors.csv").replace(/\s+/g, "_");
    const path = `${orgId}/${Date.now()}-${safeName}`;

    const stream = fs.createReadStream(file.filepath);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, stream, {
        contentType: file.mimetype || "text/csv",
        duplex: "half",
      });

    if (uploadErr) {
      throw uploadErr;
    }

    // 4️⃣ Insert into Neon (ONLY REAL COLUMNS)
    await sql`
      INSERT INTO vendor_uploads (
        org_id,
        mime_type,
        created_by
      )
      VALUES (
        ${orgId},
        ${file.mimetype || "text/csv"},
        ${userId}
      );
    `;

    return res.status(200).json({
      ok: true,
      orgId,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}

