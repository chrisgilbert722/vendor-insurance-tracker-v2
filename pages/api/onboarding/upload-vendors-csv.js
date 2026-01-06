// pages/api/onboarding/upload-vendors-csv.js
// Vendor CSV Upload → Supabase Storage (bucket: vendor-uploads) + Neon vendor_uploads row
// - Accepts orgId as Neon org UUID (organizations.external_uuid)
// - Verifies Supabase user via Authorization: Bearer <access_token>
// - Resolves Neon org INT id via organizations.external_uuid + organization_members.user_id
// - Uploads to Supabase Storage using SERVICE ROLE
// - Inserts metadata into Neon vendor_uploads (org_id INT) to release data-gate

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: false },
};

// Supabase admin client (server only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // 1) Auth: require Supabase access token (from browser session)
    const token = getBearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ ok: false, error: "Authentication session missing. Please refresh." });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }
    const authUserId = userData.user.id;

    // 2) Parse multipart form
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded (field: file)" });
    }

    // IMPORTANT: orgId is the org UUID you use everywhere in the app (organizations.external_uuid)
    const orgUuid = Array.isArray(fields.orgId) ? fields.orgId[0] : fields.orgId;
    if (!orgUuid) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId (expected organizations.external_uuid UUID)",
      });
    }

    // 3) Resolve Neon org INT id + verify membership
    const orgRows = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_members om ON om.org_id = o.id
      WHERE o.external_uuid = ${orgUuid}
        AND om.user_id = ${authUserId}
      LIMIT 1;
    `;

    if (!orgRows?.length) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for orgId",
      });
    }

    const orgIdInt = orgRows[0].id;

    // 4) Upload to Supabase Storage bucket
    const bucket = "vendor-uploads"; // ✅ matches what you showed in Supabase Storage
    const originalName = file.originalFilename || "vendors.csv";
    const safeName = originalName.replace(/\s+/g, "_");
    const objectPath = `vendors-csv/${orgUuid}/${Date.now()}-${safeName}`;

    const stream = fs.createReadStream(file.filepath);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, stream, {
        contentType: file.mimetype || "text/csv",
        duplex: "half",
        upsert: false,
      });

    if (uploadError) {
      console.error("[upload-vendors-csv] storage error:", uploadError);
      return res.status(500).json({ ok: false, error: uploadError.message || "Storage upload failed" });
    }

    // 5) Insert metadata into Neon vendor_uploads (this releases the data-gate)
    await sql`
      INSERT INTO vendor_uploads (
        org_id,
        storage_bucket,
        file_path,
        original_name,
        mime_type,
        size_bytes,
        created_by
      )
      VALUES (
        ${orgIdInt},
        ${bucket},
        ${objectPath},
        ${originalName},
        ${file.mimetype || "text/csv"},
        ${Number(file.size || 0)},
        ${authUserId}
      );
    `;

    return res.status(200).json({
      ok: true,
      orgId: orgUuid,
      orgIdInt,
      bucket,
      file_path: objectPath,
      originalName,
    });
  } catch (err) {
    console.error("[upload-vendors-csv] handler error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Upload failed." });
  }
}
