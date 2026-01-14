// pages/api/onboarding/upload-vendors-csv.js
// PHASE 1 — CSV INGEST + VENDOR INSERT (SERVER-ONLY, FAIL-OPEN)

import formidable from "formidable";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const runtime = "nodejs";

export const config = {
  api: { bodyParser: false },
};

// 🔐 SERVER-ONLY SUPABASE (SERVICE ROLE)
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
    /* ---------------------------------------------
       AUTH (FAIL-OPEN)
    ---------------------------------------------- */
    const token = getBearerToken(req);

    if (!token) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "Session not ready",
        headers: [],
        rows: [],
        inserted: 0,
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
        inserted: 0,
      });
    }

    const userId = data.user.id;

    /* ---------------------------------------------
       PARSE MULTIPART
    ---------------------------------------------- */
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

    /* ---------------------------------------------
       RESOLVE ORG (UUID → INT)
    ---------------------------------------------- */
    const orgRows = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_members om ON om.org_id = o.id
      WHERE o.external_uuid = ${orgUuid}
        AND om.user_id = ${userId}
      LIMIT 1;
    `;

    if (!orgRows.length) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "Org not found for user",
        headers: [],
        rows: [],
        inserted: 0,
      });
    }

    const orgIdInt = orgRows[0].id;

    /* ---------------------------------------------
       PARSE CSV (BASIC + SLOPPY-SAFE)
    ---------------------------------------------- */
    const text = fs.readFileSync(file.filepath, "utf8");

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return res.status(200).json({
        ok: true,
        headers: [],
        rows: [],
        inserted: 0,
      });
    }

    const headers = lines[0].split(",").map((h) => h.trim());

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",");
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (cols[i] || "").trim();
      });
      return obj;
    });

    /* ---------------------------------------------
       INSERT VENDORS (AUTHORITATIVE)
    ---------------------------------------------- */
    let inserted = 0;

    for (const r of rows) {
      const name =
        r.vendor_name ||
        r.vendor ||
        r.company ||
        r.name ||
        "";

      if (!name) continue;

      const email = r.email || null;

      const exists = await sql`
        SELECT 1
        FROM vendors
        WHERE org_id = ${orgIdInt}
          AND name = ${name}
        LIMIT 1;
      `;

      if (exists.length) continue;

      await sql`
        INSERT INTO vendors (org_id, name, email)
        VALUES (${orgIdInt}, ${name}, ${email});
      `;

      inserted++;
    }

    return res.status(200).json({
      ok: true,
      headers,
      rows,
      inserted,
    });
  } catch (err) {
    console.error("[upload-vendors-csv]", err);
    return res.status(200).json({
      ok: true,
      skipped: true,
      error: err.message || "Upload failed",
      headers: [],
      rows: [],
      inserted: 0,
    });
  }
}
