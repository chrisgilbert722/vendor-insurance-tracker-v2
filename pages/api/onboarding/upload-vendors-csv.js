// pages/api/onboarding/upload-vendors-csv.js
// FINAL NEON-SAFE VERSION
// - Uploads CSV to Supabase Storage
// - Inserts MINIMAL row into Neon vendor_uploads
// - MATCHES REAL SCHEMA (org_id ONLY)
// - No phantom columns
// - No org_members joins
// - No created_at assumptions

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: false },
};

// Supabase service-role client (server only)
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
    // 1) Require Supabase session
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Authentication session missing. Please refresh.",
      });
    }

    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    // 2) Parse multipart form
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
        error: "Missing orgId",
      });
    }

    // 3) Upload to Supabase Storage
    const bucket = "vendor-uploads";
    const safeName = (file.originalFilename || "vendors.csv").replace(/\s+/g, "_");
    const objectPath = `vendors-csv/${orgId}/${Date.now()}-${safeName}`;

    const stream = fs.createReadStream(file.filepath);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, stream, {
        contentType: file.mimetype || "text/csv",
        duplex: "half",
      });

    if (uploadError) {
      return res.status(500).json({
        ok: false,
        error: uploadError.message,
      });
    }

    // 4) MINIMAL NEON INSERT (MATCHES REAL SCHEMA)
    await sql`
      INSERT INTO vendor_uploads (org_id)
      VALUES (${orgId});
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
