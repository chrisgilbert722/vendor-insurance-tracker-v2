// pages/api/onboarding/upload-vendors-csv.js
// FINAL NEON-SAFE VERSION — MATCHES REAL vendor_uploads SCHEMA

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: false },
};

// Supabase service-role client (SERVER ONLY)
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
       1) AUTH — verify Supabase session
    -------------------------------------------------- */
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

    const authUserId = userData.user.id; // UUID string

    /* -------------------------------------------------
       2) PARSE MULTIPART FORM
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
      return res.status(400).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    /* -------------------------------------------------
       3) RESOLVE NEON org_id (INT) + MEMBERSHIP CHECK
    -------------------------------------------------- */
    const orgRows = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_members om
        ON om.org_id = o.id
      WHERE o.external_uuid = ${orgUuid}
        AND om.user_id = ${authUserId}
      LIMIT 1;
    `;

    if (!orgRows.length) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for orgId",
      });
    }

    const orgIdInt = orgRows[0].id;

    /* -------------------------------------------------
       4) UPLOAD FILE TO SUPABASE STORAGE
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
       5) INSERT INTO NEON vendor_uploads (REAL COLUMNS)
    -------------------------------------------------- */
    await sql`
      INSERT INTO vendor_uploads (
        org_id,
        filename,
        mime_type,
        uploaded_by
      )
      VALUES (
        ${orgIdInt},
        ${safeFilename},
        ${file.mimetype || "text/csv"},
        ${authUserId}
      );
    `;

    return res.status(200).json({
      ok: true,
      orgId: orgUuid,
      orgIdInt,
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
