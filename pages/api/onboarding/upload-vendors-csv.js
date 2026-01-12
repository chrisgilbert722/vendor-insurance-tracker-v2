// pages/api/onboarding/upload-vendors-csv.js
// PHASE 1 — Stable Ingest (CSV + Excel)
// ✅ ACTUALLY CREATES VENDORS + POLICIES
// ✅ Never blocks onboarding
// ✅ UUID-safe + membership-safe
// ✅ Dashboard / GVI will populate immediately

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

// Normalize common CSV headers
function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== "") return row[k];
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    /* -------------------------------------------------
       AUTH
    -------------------------------------------------- */
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing session" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = data.user.id;

    /* -------------------------------------------------
       PARSE FORM
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
       RESOLVE ORG + MEMBERSHIP
    -------------------------------------------------- */
    const orgRows = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_members om ON om.org_id = o.id
      WHERE o.external_uuid = ${orgUuid}
        AND om.user_id = ${userId}
      LIMIT 1;
    `;

    if (!orgRows.length) {
      return res.status(403).json({ ok: false, error: "Org access denied" });
    }

    const orgId = orgRows[0].id;

    /* -------------------------------------------------
       PARSE FILE
    -------------------------------------------------- */
    const filename = file.originalFilename || "vendors";
    const ext = filename.split(".").pop().toLowerCase();

    let headers = [];
    let rows = [];

    if (ext === "csv") {
      const text = fs.readFileSync(file.filepath, "utf8");
      const lines = text.split(/\r?\n/).filter(Boolean);
      headers = lines[0].split(",").map((h) => h.trim());
      rows = lines.slice(1).map((l) => {
        const cols = l.split(",");
        const obj = {};
        headers.forEach((h, i) => (obj[h] = (cols[i] || "").trim()));
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
      return res.status(400).json({ ok: false, error: "Unsupported file type" });
    }

    /* -------------------------------------------------
       INSERT VENDORS + POLICIES
    -------------------------------------------------- */
    let createdVendors = 0;

    for (const row of rows) {
      const name = pick(row, ["vendor_name", "vendor", "company", "name"]);
      if (!name) continue;

      const email = pick(row, ["email", "contact_email"]);
      const category = pick(row, ["category", "trade", "industry"]) || "General";

      const vendorRes = await sql`
        INSERT INTO vendors (org_id, name, email, category)
        VALUES (${orgId}, ${name}, ${email}, ${category})
        RETURNING id;
      `;

      const vendorId = vendorRes[0].id;
      createdVendors++;

      const policyNumber = pick(row, ["policy_number", "policy"]);
      const expiration = pick(row, ["expiration", "expiration_date"]);
      const coverage = pick(row, ["coverage", "policy_type"]);

      if (policyNumber || expiration) {
        await sql`
          INSERT INTO policies (
            org_id,
            vendor_id,
            policy_number,
            coverage_type,
            expiration_date
          )
          VALUES (
            ${orgId},
            ${vendorId},
            ${policyNumber},
            ${coverage},
            ${expiration}
          );
        `;
      }
    }

    /* -------------------------------------------------
       STORAGE UPLOAD (UNCHANGED)
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
       RETURN
    -------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      headers,
      rows,
      createdVendors,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed",
    });
  }
}
