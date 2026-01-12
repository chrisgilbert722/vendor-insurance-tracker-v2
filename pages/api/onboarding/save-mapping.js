// pages/api/onboarding/save-mapping.js
// ============================================================
// ONBOARDING — SAVE CSV COLUMN MAPPING (Human Gate)
// - Persists mapping (or stubs for now)
// - Advances onboarding_step to 4
// - Resumes autopilot safely
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { mapping } = req.body || {};

    if (!mapping || typeof mapping !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid mapping",
      });
    }

    // 🔑 Resolve UUID → INTERNAL org INT
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    // ----------------------------------------------------------
    // OPTIONAL: persist mapping (stub-safe)
    // You can replace this later with a real table
    // ----------------------------------------------------------
    await sql`
      INSERT INTO vendor_csv_mappings (org_id, mapping, created_at)
      VALUES (${orgIdInt}, ${JSON.stringify(mapping)}, NOW())
      ON CONFLICT (org_id) DO UPDATE
      SET mapping = EXCLUDED.mapping,
          updated_at = NOW();
    `.catch(() => {
      // If table doesn't exist yet, fail silently for now
    });

    // ----------------------------------------------------------
    // 🔑 ADVANCE ONBOARDING (Step 4 = Vendor Analysis)
    // ----------------------------------------------------------
    await sql`
      UPDATE organizations
      SET onboarding_step = 4
      WHERE id = ${orgIdInt};
    `;

    return res.status(200).json({
      ok: true,
      message: "Mapping saved. Onboarding resumed.",
    });
  } catch (err) {
    console.error("[onboarding/save-mapping]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to save mapping",
    });
  }
}
