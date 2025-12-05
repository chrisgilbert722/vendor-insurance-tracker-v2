// pages/api/vendors/import-csv.js
// GOD MODE — CSV Vendor Import (V2, Dependency-Free)
// Internal CSV parser (no papaparse) for maximum stability.

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
  },
};

// ==============================================
// INTERNAL CSV PARSER — Simple + perfect for vendors
// ==============================================
function parseCSV(text) {
  if (!text) return [];

  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  // Split header row into columns
  const headers = lines[0].split(",").map((h) => h.trim());

  // Parse each row into an object
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = (cols[i] || "").trim();
    });

    return obj;
  });

  return rows;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only",
    });
  }

  try {
    const { orgId, csvText } = req.body || {};

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    if (!csvText || typeof csvText !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid CSV text." });
    }

    // 🔍 Parse CSV text into objects
    const rows = parseCSV(csvText);
    if (!rows || rows.length === 0) {
      return res.status(400).json({
        ok: false,
        error:
          "CSV appears empty or unparseable. Ensure it includes a header row.",
      });
    }

    const results = [];
    let createdCount = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = (row.vendor_name || row.name || "").trim();
      const email = (row.email || "").trim();
      const category = (row.category || "").trim() || "General";

      if (!name) {
        results.push({
          row,
          status: "skipped",
          reason: "Missing vendor_name",
        });
        skipped++;
        continue;
      }

      // Check for duplicates
      const existing = await sql`
        SELECT id FROM vendors 
        WHERE org_id = ${orgId} AND vendor_name = ${name}
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

      // Insert vendor
      const inserted = await sql`
        INSERT INTO vendors (org_id, vendor_name, email, category)
        VALUES (${orgId}, ${name}, ${email || null}, ${category})
        RETURNING id, vendor_name
      `;

      createdCount++;

      results.push({
        row,
        status: "created",
        vendorId: inserted[0].id,
        name: inserted[0].vendor_name,
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
      error: "CSV import failed.",
      details: err.message,
    });
  }
}

