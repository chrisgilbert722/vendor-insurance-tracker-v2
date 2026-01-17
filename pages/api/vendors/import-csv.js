// pages/api/vendors/import-csv.js
// GOD MODE — CSV Vendor Import (V2, UUID-SAFE)
// Internal CSV parser (no papaparse) for maximum stability.

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
  },
};

// ==============================================
// INTERNAL CSV PARSER — Simple + stable
// ==============================================
function parseCSV(text) {
  if (!text) return [];

  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").trim();
    });
    return obj;
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // 🔑 RESOLVE ORG (UUID → INT)
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Organization not resolved",
      });
    }

    const { csvText } = req.body || {};

    if (!csvText || typeof csvText !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid CSV text.",
      });
    }

    const rows = parseCSV(csvText);
    if (!rows.length) {
      return res.status(400).json({
        ok: false,
        error: "CSV appears empty or invalid.",
      });
    }

    const results = [];
    let createdCount = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = (row.vendor_name || row.name || "").trim();
      const email = (row.email || "").trim() || null;

      if (!name) {
        results.push({
          row,
          status: "skipped",
          reason: "Missing vendor name",
        });
        skipped++;
        continue;
      }

      // 🔍 Duplicate check (CORRECT COLUMN)
      const existing = await sql`
        SELECT id FROM vendors
        WHERE org_id = ${orgId}
          AND name = ${name}
        LIMIT 1;
      `;

      if (existing.length > 0) {
        results.push({
          row,
          status: "skipped",
          reason: "Duplicate vendor",
        });
        skipped++;
        continue;
      }

      // ✅ INSERT VENDOR (CORRECT SCHEMA)
      const inserted = await sql`
        INSERT INTO vendors (org_id, name, email)
        VALUES (${orgId}, ${name}, ${email})
        RETURNING id, name;
      `;

      createdCount++;

      results.push({
        row,
        status: "created",
        vendorId: inserted[0].id,
        name: inserted[0].name,
      });
    }

    return res.status(200).json({
      ok: true,
      created: createdCount,
      skipped,
      results,
      message: `Imported ${createdCount} vendors, skipped ${skipped}.`,
    });
  } catch (err) {
    console.error("[CSV IMPORT ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "CSV import failed",
      details: err.message,
    });
  }
}
