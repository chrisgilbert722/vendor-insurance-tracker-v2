// pages/api/onboarding/upload-vendors-csv.js
// PHASE 1 — CSV INGEST + VENDOR CREATION (FINAL)
// ✅ Parses CSV / Excel
// ✅ Resolves org_id safely
// ✅ INSERTS vendors immediately
// ✅ Dedupes by (org_id, name)
// ✅ Never bricks onboarding

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const runtime = "nodejs";

export const config = {
  api: { bodyParser: false },
};

// Supabase admin (server-only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function normalize(v) {
  return String(v || "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    /* -------------------------------------------
       AUTH
    ------------------------------------------- */
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing session" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = data.user.id;

    /* -------------------------------------------
       PARSE FORM
    ------------------------------------------- */
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

    /* -------------------------------------------
       RESOLVE org_id (INT)
    ------------------------------------------- */
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
        error: "Organization not found for user",
      });
    }

    const orgId = orgRows[0].id;

    /* -------------------------------------------
       PARSE FILE CONTENT
    ------------------------------------------- */
    const filename = file.originalFilename || "vendors.csv";
    const ext = filename.split(".").pop().toLowerCase();

    let headers = [];
    let rows = [];

    if (ext === "csv") {
      const text = fs.readFileSync(file.filepath, "utf8");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      headers = lines[0]?.split(",").map((h) => h.trim()) || [];

      rows = lines.slice(1).map((line) => {
        const cols = line.split(",");
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = cols[i] || "";
        });
        return obj;
      });
    } else if (ext === "xls" || ext === "xlsx") {
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

    /* -------------------------------------------
       INSERT VENDORS (DEDUPED)
    ------------------------------------------- */
    let inserted = 0;

    for (const r of rows) {
      const name =
        normalize(r.name) ||
        normalize(r.vendor_name) ||
        normalize(r.vendor);

      if (!name) continue;

      const email = normalize(r.email);
      const phone = normalize(r.phone);
      const address = normalize(r.address);

      // Deduplicate per org
      const exists = await sql`
        SELECT id FROM vendors
        WHERE org_id = ${orgId}
          AND lower(name) = lower(${name})
        LIMIT 1;
      `;

      if (exists.length) continue;

      await sql`
        INSERT INTO vendors (
          org_id,
          name,
          email,
          phone,
          address
        )
        VALUES (
          ${orgId},
          ${name},
          ${email || null},
          ${phone || null},
          ${address || null}
        );
      `;

      inserted++;
    }

    /* -------------------------------------------
       MARK ONBOARDING COMPLETE (SAFE)
    ------------------------------------------- */
    await sql`
      UPDATE org_onboarding_state
      SET
        status = 'completed',
        completed_at = now(),
        finished_at = now(),
        updated_at = now()
      WHERE org_id = ${orgId};
    `;

    return res.status(200).json({
      ok: true,
      headers,
      rows,
      inserted,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}
