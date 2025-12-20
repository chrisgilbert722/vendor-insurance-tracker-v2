// pages/api/onboarding/save-company-profile.js
// ============================================================
// ONBOARDING — SAVE COMPANY PROFILE (Human Gate #2)
// - Persists org profile data
// - Advances onboarding_step
// - Resumes autopilot
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { profile } = req.body || {};

    if (!profile || typeof profile !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid profile",
      });
    }

    // 🔑 Resolve UUID → INTERNAL org INT
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    // ----------------------------------------------------------
    // Persist profile (safe even if partial)
    // ----------------------------------------------------------
    await sql`
      UPDATE organizations
      SET
        legal_name = ${profile.legalName || null},
        display_name = ${profile.displayName || null},
        address = ${profile.address || null},
        city = ${profile.city || null},
        state = ${profile.state || null},
        zip = ${profile.zip || null},
        contact_email = ${profile.email || null},
        updated_at = NOW()
      WHERE id = ${orgIdInt};
    `;

    // ----------------------------------------------------------
    // 🔑 ADVANCE ONBOARDING (next step after profile)
    // ----------------------------------------------------------
    await sql`
      UPDATE organizations
      SET onboarding_step = onboarding_step + 1
      WHERE id = ${orgIdInt};
    `;

    return res.status(200).json({
      ok: true,
      message: "Company profile saved. Onboarding resumed.",
    });
  } catch (err) {
    console.error("[onboarding/save-company-profile]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to save company profile",
    });
  }
}
