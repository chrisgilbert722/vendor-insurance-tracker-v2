// pages/api/onboarding/assign-requirements.js
// ===========================================================
// STEP 6 — Assign AI Requirement Profiles To Each Vendor
// ===========================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "Use POST." });
    }

    const { assignments } = req.body || {};

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "assignments[] is required.",
      });
    }

    for (const a of assignments) {
      await sql`
        UPDATE vendors
        SET requirements_json = ${a.requirements},
            updated_at = NOW()
        WHERE id = ${a.vendorId};
      `;

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          (SELECT org_id FROM vendors WHERE id = ${a.vendorId}),
          ${a.vendorId},
          'requirements_assigned',
          'AI Requirements assigned via onboarding wizard.',
          'info'
        );
      `;
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[ASSIGN REQUIREMENTS ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
