// pages/api/onboarding/get-mapping.js
// ============================================================
// ONBOARDING — GET SAVED CSV COLUMN MAPPING
// - Returns latest mapping for org (if exists)
// - Safe to call on every load
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // Resolve org UUID → internal org ID
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) {
      return res.status(200).json({ ok: true, mapping: null });
    }

    const rows = await sql`
      SELECT mapping
      FROM vendor_csv_mappings
      WHERE org_id = ${orgIdInt}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.status(200).json({ ok: true, mapping: null });
    }

    return res.status(200).json({
      ok: true,
      mapping: rows[0].mapping,
    });
  } catch (err) {
    console.error("[onboarding/get-mapping]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load mapping",
    });
  }
}
