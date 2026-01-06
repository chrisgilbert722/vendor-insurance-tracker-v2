// pages/api/onboarding/upload-vendors-csv.js
// FINAL NEON-SAFE VERSION
// - Uploads CSV to Supabase Storage
// - Inserts ONLY org_id into Neon vendor_uploads
// - No extra columns (matches real schema)

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: false },
};

// Supabase service role (storage only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // 1️⃣ Require auth session
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

    // 2️⃣ Parse multipart
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const orgUuid = Array.isArray(fields.orgId)
      ? fields.orgId[0]
      : fields.orgId;

    if (!orgUuid) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // 3️⃣ Resolve Neon org.id (INT) via external_uuid
    const rows = await sql`
      SELECT id
      FROM organizations
      WHERE external_uuid = ${orgUuid}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for orgId",
      });
    }

    const orgIdInt = rows[0].id;

    // 4️⃣ Upload to Supabase Storage
    const bucket = "vendor-uploads";
    const safeName = (file.originalFilename || "vendors.csv").replace(/\s+/g, "_");
    const objectPath = `vendors/${orgUuid}/${Date.now()}-${safeName}`;

    const stream = fs.createReadStream(file.filepath);

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, stream, {
        contentType: file.mimetype || "text/csv",
        duplex: "half",
      });

    if (uploadErr) {
      return res.status(500).json({
        ok: false,
        error: uploadErr.message,
      });
    }

    // 5️⃣ NEON-SAFE INSERT (ONLY org_id)
    await sql`
      INSERT INTO vendor_uploads (org_id)
      VALUES (${orgIdInt});
    `;

    return res.status(200).json({
      ok: true,
      orgId: orgUuid,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}
