// pages/api/onboarding/upload-vendors-csv.js
// FINAL, NEON-SAFE, SCHEMA-ACCURATE VERSION
// - Uploads CSV to Supabase Storage
// - Inserts into Neon vendor_uploads
// - Advances org_onboarding_state correctly (NO fake columns)

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: false },
};

// Supabase service role (server only)
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
    /* -------------------------------------------------
       1) AUTH
    -------------------------------------------------- */
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

    /* -------------------------------------------------
       2) PARSE FORM
    -------------------------------------------------- */
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

    /* -------------------------------------------------
       3) RESOLVE ORG (NEON)
    -------------------------------------------------- */
    const orgRows = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_members om
        ON om.org_id = o.id
      WHERE o.external_uuid = ${orgUuid}
        AND om.user_id = ${userId}
      LIMIT 1;
    `;

    if (!orgRows.length) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for orgId",
      });
    }

    const orgId = orgRows[0].id;

    /* -------------------------------------------------
       4) UPLOAD TO SUPABASE STORAGE
    -------------------------------------------------- */
    const bucket = "vendor-uploads";
    const safeFilename = (file.originalFilename || "vendors.csv")
      .replace(/\s+/g, "_");

    const objectPath = `vendors-csv/${orgUuid}/${Date.now()}-${safeFilename}`;
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

    /* -------------------------------------------------
       5) INSERT vendor_uploads (REAL SCHEMA)
    -------------------------------------------------- */
    await sql`
      INSERT INTO vendor_uploads (
        org_id,
        filename,
        mime_type,
        uploaded_by
      )
      VALUES (
        ${orgId},
        ${safeFilename},
        ${file.mimetype || "text/csv"},
        ${userId}
      );
    `;

    /* -------------------------------------------------
       6) ADVANCE ONBOARDING STATE (CORRECT WAY)
    -------------------------------------------------- */
    await sql`
      UPDATE org_onboarding_state
      SET
        current_step = 'vendors_uploaded',
        progress = 25,
        updated_at = now()
      WHERE org_id = ${orgId};
    `;

    return res.status(200).json({
      ok: true,
      orgId,
      filename: safeFilename,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}

