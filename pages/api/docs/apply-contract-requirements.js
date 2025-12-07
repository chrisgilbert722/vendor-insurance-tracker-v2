// pages/api/docs/apply-contract-requirements.js
// ===============================================================
// APPLY CONTRACT REQUIREMENTS TO VENDOR
//
// Called AFTER extract-contract.js, when an admin confirms that
// the extracted contract insurance profile should become the
// vendor's official requirements_json.
//
// SAFE MERGE STRATEGY:
//   - Never wipes out existing unrelated keys
//   - Overwrites only coverage-related fields
//   - Adds/updates requiredEndorsements array
//   - Tracks version (`contract-v1`)
//   - Logs timeline event
//   - Creates an info alert for visibility
//
// Expected POST JSON:
// {
//   "vendorId": number,
//   "orgId": number,
//   "requirementsProfile": { ...contract-v1 data... }
// }
//
// Returns updated vendor.requirements_json
// ===============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "Use POST." });
    }

    const { vendorId, orgId, requirementsProfile } = req.body || {};

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "vendorId and orgId are required.",
      });
    }

    if (!requirementsProfile || typeof requirementsProfile !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid requirementsProfile.",
      });
    }

    // ===========================================================
    // 1️⃣ LOAD EXISTING vendor.requirements_json
    // ===========================================================
    const rows = await sql`
      SELECT id, vendor_name, requirements_json
      FROM vendors
      WHERE id = ${vendorId} AND org_id = ${orgId}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found.",
      });
    }

    const vendor = rows[0];
    const existing = vendor.requirements_json || {};

    // ===========================================================
    // 2️⃣ SAFE MERGE LOGIC — DO NOT WIPE HUMAN-ENTERED DATA
    // ===========================================================

    const merged = {
      ...existing,

      // Mark that we're using contract-derived logic
      version: requirementsProfile.version || "contract-v1",

      // Replace only coverage-level requirements
      coverages: {
        ...existing.coverages,
        ...requirementsProfile.coverages,
      },

      // Replace endorsement list cleanly
      requiredEndorsements: Array.isArray(requirementsProfile.requiredEndorsements)
        ? requirementsProfile.requiredEndorsements
        : existing.requiredEndorsements || [],

      additionalInsuredRequired:
        requirementsProfile.additionalInsuredRequired ??
        existing.additionalInsuredRequired ??
        null,

      waiverOfSubrogationRequired:
        requirementsProfile.waiverOfSubrogationRequired ??
        existing.waiverOfSubrogationRequired ??
        null,

      primaryNonContributoryRequired:
        requirementsProfile.primaryNonContributoryRequired ??
        existing.primaryNonContributoryRequired ??
        null,

      otherInsuranceLanguage:
        requirementsProfile.otherInsuranceLanguage ??
        existing.otherInsuranceLanguage ??
        null,

      specialConditions: Array.isArray(requirementsProfile.specialConditions)
        ? requirementsProfile.specialConditions
        : existing.specialConditions || [],

      notes:
        requirementsProfile.notes ??
        existing.notes ??
        null,
    };

    // ===========================================================
    // 3️⃣ WRITE MERGED REQUIREMENTS TO DATABASE
    // ===========================================================
    await sql`
      UPDATE vendors
      SET requirements_json = ${merged},
          updated_at = NOW()
      WHERE id = ${vendorId} AND org_id = ${orgId};
    `;

    // ===========================================================
    // 4️⃣ TIMELINE LOGGING
    // ===========================================================
    await sql`
      INSERT INTO system_timeline
      (org_id, vendor_id, action, message, severity)
      VALUES (
        ${orgId},
        ${vendorId},
        'contract_requirements_applied',
        'Contract-derived insurance requirements applied to vendor.',
        'info'
      );
    `;

    // ===========================================================
    // 5️⃣ OPTIONAL: Alert (soft info alert)
    // ===========================================================
    await sql`
      INSERT INTO alerts
      (created_at, is_read, org_id, vendor_id, type, message, severity, title, rule_label, status)
      VALUES (
        NOW(),
        false,
        ${orgId},
        ${vendorId},
        'Requirements',
        'Contract insurance requirements have been applied.',
        'Info',
        'Requirements Updated',
        'Contract Intelligence',
        'Open'
      );
    `;

    // ===========================================================
    // 6️⃣ RETURN UPDATED REQUIREMENTS
    // ===========================================================
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      requirements: merged,
    });

  } catch (err) {
    console.error("[APPLY CONTRACT REQS ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error applying contract requirements.",
    });
  }
}
