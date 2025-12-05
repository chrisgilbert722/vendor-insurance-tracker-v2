// pages/api/vendors/import-csv.js
// AI Vendor Import — CSV Loader (GOD MODE v1)

import { sql } from "../../../lib/db";
import Papa from "papaparse";

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" }, // allow large CSV uploads
  },
};

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
    if (!csvText) {
      return res.status(400).json({ ok: false, error: "Missing CSV text" });
    }

    // 🔍 Parse CSV
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: "CSV parsing error",
        details: parsed.errors,
      });
    }

    const rows = parsed.data;
    const results = [];
    let createdCount = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = (row.vendor_name || "").trim();
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

      // Check if vendor already exists
      const existing = await sql`
        SELECT id FROM vendors WHERE org_id = ${orgId} AND vendor_name = ${name}
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
      message: `Imported ${createdCount} vendors, skipped ${skipped}`,
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
