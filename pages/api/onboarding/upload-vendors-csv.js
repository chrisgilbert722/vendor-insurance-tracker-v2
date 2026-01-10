// pages/api/onboarding/upload-vendors-csv.js
// PHASE 1 LOCKED — Stable Ingest (CSV + Excel, never blocks AI)

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

// 🔑 FORCE NODE RUNTIME (avoids Turbopack edge analysis)
export const runtime = "nodejs";

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

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = data.user.id;

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
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    /* -------------------------------------------------
       3) RESOLVE ORG + MEMBERSHIP
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

    const orgIdInt = orgRows[0].id;

    /* -------------------------------------------------
       4) PARSE FILE CONTENT (CSV OR EXCEL)
       ⚠️ IMPORTANT: NEVER BLOCK ANALYSIS
    -------------------------------------------------- */
    const filename = file.originalFilename || "vendors";
    const ext = filename.split(".").pop().toLowerCase();

    let headers = [];
    let rows = [];

    if (ext === "csv") {
      const text = fs.readFileSync(file.filepath, "utf8");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length) {
        headers = lines[0].split(",").map((h) => h.trim());
        rows = lines.slice(1).map((line) => {
          const cols = line.split(",");
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = (cols[i] || "").trim();
          });
          return obj;
        });
      }
    } else if (ext === "xls" || ext === "xlsx") {
      // 🔑 Dynamic import — Turbopack safe
      const mod = await import("xlsx");
      const XLSX = mod.default || mod;

      const workbook = XLSX.read(fs.readFileSync(file.filepath));
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      headers = Object.keys(rows[0] || {});
    } else {
      return res.status(400).json({
        ok: false,
        error: "Unsupported file type",
      });
    }

    /* -------------------------------------------------
       5) UPLOAD ORIGINAL FILE TO SUPABASE STORAGE
    -------------------------------------------------- */
    const safeFilename = filename.replace(/\s+/g, "_");
    const objectPath = `vendors-csv/${orgUuid}/${Date.now()}-${safeFilename}`;

    await supabaseAdmin.storage
      .from("vendor-uploads")
      .upload(objectPath, fs.createReadStream(file.filepath), {
        contentType: file.mimetype || "application/octet-stream",
        duplex: "half",
      });

    /* -------------------------------------------------
       6) INSERT vendor_uploads ROW
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
        ${file.mimetype || "application/octet-stream"},
        ${userId}
      );
    `;

    /* -------------------------------------------------
       7) COMPLETE ONBOARDING (UNCHANGED)
    -------------------------------------------------- */
    await sql`
      UPDATE org_onboarding_state
      SET
        status = 'completed',
        completed_at = now(),
        finished_at = now(),
        updated_at = now()
      WHERE org_id = ${orgIdInt};
    `;

    /* -------------------------------------------------
       8) ALWAYS RETURN DATA (EVEN IF PARTIAL)
    -------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      headers,
      rows,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}
