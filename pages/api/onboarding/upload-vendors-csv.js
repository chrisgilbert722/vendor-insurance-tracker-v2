// pages/api/onboarding/upload-vendors-csv.js
// PHASE 1 — Stable Ingest (CSV + Excel)
// ✅ Auth (Supabase) for user
// ✅ Resolve org via org membership
// ✅ Upload raw file to storage
// ✅ Insert vendor_uploads row
// ✅ INSERT vendors into Neon (vendors table) so dashboard/vendors populate

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const runtime = "nodejs";

export const config = {
  api: { bodyParser: false },
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

function str(v) {
  return v == null ? "" : String(v).trim();
}

// Heuristic extraction (handles your test CSV + most common headers)
function extractVendorRow(row) {
  const name =
    str(row.vendor_name) ||
    str(row.vendor) ||
    str(row.vendorName) ||
    str(row.name) ||
    str(row.company) ||
    str(row.company_name) ||
    str(row.insured) ||
    "";

  const email = str(row.email) || str(row.contact_email) || str(row.contactEmail) || "";

  const category =
    str(row.category) ||
    str(row.trade) ||
    str(row.industry) ||
    str(row.profession) ||
    "General";

  // optional (we are not depending on policies being inserted)
  const policyNumber = str(row.policy_number) || str(row.policyNumber) || str(row.policy) || "";
  const expiration = str(row.expiration_date) || str(row.expiration) || str(row.expDate) || "";

  return { name, email, category, policyNumber, expiration };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // 1) AUTH
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

    // 2) PARSE MULTIPART
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const orgUuid = Array.isArray(fields.orgId) ? fields.orgId[0] : fields.orgId;
    if (!orgUuid) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // 3) RESOLVE ORG + MEMBERSHIP
    const orgRows = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_members om ON om.org_id = o.id
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

    // 4) PARSE FILE CONTENT
    const filename = file.originalFilename || "vendors";
    const safeFilename = filename.replace(/\s+/g, "_");
    const ext = safeFilename.split(".").pop().toLowerCase();

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
      const mod = await import("xlsx");
      const XLSX = mod.default || mod;

      const workbook = XLSX.read(fs.readFileSync(file.filepath));
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      headers = Object.keys(rows[0] || {});
    } else {
      return res.status(400).json({ ok: false, error: "Unsupported file type" });
    }

    // 5) UPLOAD RAW FILE TO STORAGE (best-effort)
    try {
      const objectPath = `vendors-csv/${orgUuid}/${Date.now()}-${safeFilename}`;
      await supabaseAdmin.storage
        .from("vendor-uploads")
        .upload(objectPath, fs.createReadStream(file.filepath), {
          contentType: file.mimetype || "application/octet-stream",
          duplex: "half",
        });
    } catch (e) {
      console.warn("[upload-vendors-csv] storage upload failed (continuing):", e?.message);
    }

    // 6) INSERT vendor_uploads ROW (best-effort)
    try {
      await sql`
        INSERT INTO vendor_uploads (org_id, filename, mime_type, uploaded_by)
        VALUES (${orgIdInt}, ${safeFilename}, ${file.mimetype || "application/octet-stream"}, ${userId});
      `;
    } catch (e) {
      console.warn("[upload-vendors-csv] vendor_uploads insert failed (continuing):", e?.message);
    }

    // ✅ 7) INSERT VENDORS INTO NEON (THIS IS THE MISSING PIECE)
    let created = 0;
    let skipped = 0;

    for (const r of rows) {
      const v = extractVendorRow(r);
      if (!v.name) {
        skipped++;
        continue;
      }

      // dedupe by (org_id + name) to avoid spam inserts
      const existing = await sql`
        SELECT id FROM vendors
        WHERE org_id = ${orgIdInt}
          AND name = ${v.name}
        LIMIT 1;
      `;

      if (existing.length) {
        skipped++;
        continue;
      }

      await sql`
        INSERT INTO vendors (org_id, name, email, category)
        VALUES (${orgIdInt}, ${v.name}, ${v.email || null}, ${v.category || "General"});
      `;

      created++;
    }

    // 8) Move org step forward to at least "uploaded" (optional, safe)
    try {
      await sql`
        UPDATE organizations
        SET onboarding_step = GREATEST(onboarding_step, 1)
        WHERE id = ${orgIdInt};
      `;
    } catch {}

    return res.status(200).json({
      ok: true,
      headers,
      rows,
      inserted: { created, skipped },
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}
