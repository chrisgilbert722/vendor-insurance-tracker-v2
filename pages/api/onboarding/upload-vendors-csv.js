// pages/api/onboarding/upload-vendors-csv.js
// PHASE 1 — CSV / XLSX INGEST (FAIL-OPEN, REAL-WORLD SAFE)

import formidable from "formidable";
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
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

function safeTrim(v) {
  return typeof v === "string" ? v.trim() : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    /* -------------------------------------------------
       AUTH (FAIL-OPEN)
    -------------------------------------------------- */
    const token = getBearerToken(req);

    if (!token) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "Session not ready",
        headers: [],
        rows: [],
      });
    }

    const { data } = await supabaseAdmin.auth.getUser(token);
    if (!data?.user) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "Invalid session",
        headers: [],
        rows: [],
      });
    }

    const userId = data.user.id;

    /* -------------------------------------------------
       PARSE MULTIPART
    -------------------------------------------------- */
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(200).json({
        ok: true,
        headers: [],
        rows: [],
      });
    }

    const orgUuid = Array.isArray(fields.orgId)
      ? fields.orgId[0]
      : fields.orgId;

    if (!orgUuid) {
      return res.status(200).json({
        ok: true,
        headers: [],
        rows: [],
      });
    }

    /* -------------------------------------------------
       RESOLVE ORG (UUID → INT)
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
      return res.status(200).json({
        ok: true,
        headers: [],
        rows: [],
      });
    }

    const orgIdInt = orgRows[0].id;

    /* -------------------------------------------------
       PARSE FILE (CSV OR XLSX)
    -------------------------------------------------- */
    const ext = path.extname(file.originalFilename || "").toLowerCase();

    let headers = [];
    let rows = [];

    if (ext === ".xlsx" || ext === ".xls") {
      // ✅ EXCEL PARSE
      const workbook = xlsx.readFile(file.filepath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const json = xlsx.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      if (json.length) {
        headers = Object.keys(json[0]);
        rows = json.map((r) => {
          const clean = {};
          headers.forEach((h) => {
            clean[h] = safeTrim(r[h]);
          });
          return clean;
        });
      }
    } else {
      // ✅ CSV PARSE (TOLERANT)
      const text = fs.readFileSync(file.filepath, "utf8");
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length >= 2) {
        headers = lines[0].split(",").map((h) => h.trim());

        rows = lines.slice(1).map((line) => {
          const cols = line.split(",");
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = safeTrim(cols[i]);
          });
          return obj;
        });
      }
    }

    /* -------------------------------------------------
       INSERT VENDORS (BEST-EFFORT, NON-BLOCKING)
    -------------------------------------------------- */
    for (const r of rows) {
      const name =
        r.vendor_name ||
        r.vendor ||
        r.company ||
        r.name ||
        "";

      if (!name) continue;

      await sql`
        INSERT INTO vendors (org_id, name)
        VALUES (${orgIdInt}, ${name})
        ON CONFLICT DO NOTHING;
      `;
    }

    return res.status(200).json({
      ok: true,
      headers,
      rows,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(200).json({
      ok: true,
      skipped: true,
      headers: [],
      rows: [],
    });
  }
}
