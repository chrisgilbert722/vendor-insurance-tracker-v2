// pages/api/onboarding/upload-vendors-csv.js
// PHASE 1 — Stable Ingest (CSV + Excel) + CREATE VENDORS (NEON)
// ✅ Creates vendors immediately on upload (Option A)
// ✅ UUID-safe (external_uuid -> internal org_id INT)
// ✅ Membership-checked (organization_members)
// ✅ Fail-open storage + vendor_uploads logging (never blocks vendor creation)

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

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

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pickColumn(headers = [], candidates = []) {
  const map = new Map(headers.map((h) => [norm(h), h]));
  for (const c of candidates) {
    const hit = map.get(norm(c));
    if (hit) return hit;
  }
  // fuzzy contains
  for (const h of headers) {
    const nh = norm(h);
    for (const c of candidates) {
      const nc = norm(c);
      if (nc && nh.includes(nc)) return h;
    }
  }
  return null;
}

function getCell(row, header) {
  if (!row || !header) return "";
  const v = row[header];
  return v == null ? "" : String(v).trim();
}

function parseCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim()).filter(Boolean);

  const rows = lines.slice(1).map((line) => {
    // NOTE: simple CSV split (works for your test CSVs; no quoted comma support)
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").trim();
    });
    return obj;
  });

  return { headers, rows };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  let tempFilepath = null;

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

    tempFilepath = file.filepath;

    const orgUuid = Array.isArray(fields.orgId) ? fields.orgId[0] : fields.orgId;
    if (!orgUuid) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    /* -------------------------------------------------
       3) RESOLVE ORG + MEMBERSHIP (external_uuid -> org_id INT)
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

    if (!orgRows?.length) {
      return res.status(400).json({
        ok: false,
        error: "Organization not found for orgId (or not a member).",
      });
    }

    const orgIdInt = orgRows[0].id;

    /* -------------------------------------------------
       4) PARSE FILE CONTENT (CSV OR EXCEL)
    -------------------------------------------------- */
    const filename = file.originalFilename || "vendors";
    const safeFilename = filename.replace(/\s+/g, "_");
    const ext = safeFilename.split(".").pop().toLowerCase();

    let headers = [];
    let rows = [];

    if (ext === "csv") {
      const text = fs.readFileSync(file.filepath, "utf8");
      const parsed = parseCsv(text);
      headers = parsed.headers;
      rows = parsed.rows;
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
        error: "Unsupported file type (use .csv, .xls, .xlsx).",
      });
    }

    if (!headers.length || !rows.length) {
      return res.status(400).json({
        ok: false,
        error: "No usable rows found in this file.",
      });
    }

    /* -------------------------------------------------
       5) BEST-EFFORT: Upload original file to Supabase Storage
       (FAIL-OPEN — never blocks vendor creation)
    -------------------------------------------------- */
    try {
      const objectPath = `vendors-csv/${orgUuid}/${Date.now()}-${safeFilename}`;
      await supabaseAdmin.storage
        .from("vendor-uploads")
        .upload(objectPath, fs.createReadStream(file.filepath), {
          contentType: file.mimetype || "application/octet-stream",
          duplex: "half",
        });
    } catch (e) {
      console.warn("[upload-vendors-csv] storage upload skipped:", e?.message);
    }

    /* -------------------------------------------------
       6) BEST-EFFORT: Log vendor_uploads row
       (FAIL-OPEN — never blocks vendor creation)
    -------------------------------------------------- */
    try {
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
    } catch (e) {
      console.warn("[upload-vendors-csv] vendor_uploads insert skipped:", e?.message);
    }

    /* -------------------------------------------------
       7) INSERT VENDORS (THIS IS THE FIX)
       Matches your Neon vendors schema:
       - org_id (int)
       - name (text, NOT NULL)
       - email/phone/address optional
       - requirements_json jsonb
    -------------------------------------------------- */
    const nameCol =
      pickColumn(headers, ["vendor_name", "vendor name", "name", "company", "insured name", "insured"]) ||
      headers[0]; // fallback: first column

    const emailCol = pickColumn(headers, ["email", "contact_email", "contact email"]);
    const phoneCol = pickColumn(headers, ["phone", "mobile", "tel"]);
    const addressCol = pickColumn(headers, ["address", "street", "street_address", "street address"]);

    let inserted = 0;
    let skipped = 0;

    // Avoid duplicate inserts within same upload
    const seen = new Set();

    for (const r of rows) {
      const name = getCell(r, nameCol);
      if (!name) {
        skipped++;
        continue;
      }

      const key = norm(name);
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);

      const email = emailCol ? getCell(r, emailCol) : "";
      const phone = phoneCol ? getCell(r, phoneCol) : "";
      const address = addressCol ? getCell(r, addressCol) : "";

      // DB-level duplicate check (org + name)
      const existing = await sql`
        SELECT id
        FROM vendors
        WHERE org_id = ${orgIdInt}
          AND name = ${name}
        LIMIT 1;
      `;

      if (existing?.length) {
        skipped++;
        continue;
      }

      await sql`
        INSERT INTO vendors (
          org_id,
          name,
          email,
          phone,
          address,
          requirements_json
        )
        VALUES (
          ${orgIdInt},
          ${name},
          ${email || null},
          ${phone || null},
          ${address || null},
          ${JSON.stringify({})}::jsonb
        );
      `;

      inserted++;
    }

    /* -------------------------------------------------
       8) RESPONSE (UI NEEDS headers + rows)
    -------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      headers,
      rows,
      inserted,
      skipped,
    });
  } catch (err) {
    console.error("[upload-vendors-csv] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  } finally {
    // clean up temp file if possible
    try {
      if (tempFilepath) fs.unlinkSync(tempFilepath);
    } catch {}
  }
}
