// pages/api/contracts/sync-requirements.js
// ============================================================
// CONTRACT → REQUIREMENTS SYNC ENGINE V1
//
// POST /api/contracts/sync-requirements
// Body: { vendorId, orgId? }
//
// Does:
// 1) Load vendor + contract_json (normalized contract)
// 2) Extract coverage minimums + endorsements
// 3) Build requirementsProfile:
//    {
//      version: "contract-v3",
//      required_coverages: [...],
//      limits: { gl_eachOccurrence, gl_aggregate, auto_csl, umbrella_limit },
//      endorsements: [...],
//      notes: "…"
//    }
// 4) Save into vendors.requirements_json
// 5) Log to system_timeline
// ============================================================

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ ok: false, error: "Method not allowed. Use POST." });
    }

    const { vendorId: rawVendorId, orgId: rawOrgId } = req.body || {};

    const vendorId = Number(rawVendorId || 0);
    let orgId = rawOrgId ? Number(rawOrgId) : null;

    if (!vendorId || Number.isNaN(vendorId)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid vendorId." });
    }

    // ---------------------------------------------------------
    // 1) Load vendor + contract_json
    // ---------------------------------------------------------
    const vendorRows = await sql`
      SELECT
        id,
        vendor_name,
        org_id,
        contract_json
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;

    if (!vendorRows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found." });
    }

    const vendor = vendorRows[0];
    if (!orgId) orgId = vendor.org_id;

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Vendor has no org_id; orgId required." });
    }

    const contractJson = vendor.contract_json;
    if (!contractJson) {
      return res.status(400).json({
        ok: false,
        error: "No contract_json found for this vendor. Run contract parser first.",
      });
    }

    // We'll assume contractJson has a structure like:
    // {
    //   coverage_minimums: {
    //     general_liability: 1000000,
    //     auto: 1000000,
    //     workers_comp: "required",
    //     umbrella: 5000000
    //   },
    //   endorsement_clauses: {
    //     additional_insured: true,
    //     primary_non_contributory: true,
    //     waiver_of_subrogation: true
    //   },
    //   notes: "..."
    // }

    const coverageMin = contractJson.coverage_minimums || {};
    const endorsementsRaw = contractJson.endorsement_clauses || {};

    // ---------------------------------------------------------
    // 2) Build required_coverages
    // ---------------------------------------------------------
    const required_coverages = [];

    if (coverageMin.general_liability) required_coverages.push("GL");
    if (coverageMin.auto) required_coverages.push("Auto");
    if (coverageMin.workers_comp) required_coverages.push("WC");
    if (coverageMin.umbrella) required_coverages.push("Umbrella");

    // ---------------------------------------------------------
    // 3) Build limits
    // ---------------------------------------------------------
    const limits = {
      gl_eachOccurrence: coverageMin.general_liability || null,
      gl_aggregate: coverageMin.gl_aggregate || null,
      auto_csl: coverageMin.auto || null,
      umbrella_limit: coverageMin.umbrella || null,
    };

    // ---------------------------------------------------------
    // 4) Build endorsements list
    // ---------------------------------------------------------
    const endorsements = [];

    if (endorsementsRaw.additional_insured) {
      endorsements.push("Additional Insured");
    }
    if (endorsementsRaw.waiver_of_subrogation) {
      endorsements.push("Waiver of Subrogation");
    }
    if (endorsementsRaw.primary_non_contributory) {
      endorsements.push("Primary & Non-Contributory");
    }

    // ---------------------------------------------------------
    // 5) Build notes
    // ---------------------------------------------------------
    const notes =
      contractJson.notes ||
      contractJson.liability_limits ||
      "Derived from contract coverage_minimums + endorsement_clauses.";

    // ---------------------------------------------------------
    // 6) Final requirementsProfile object
    // ---------------------------------------------------------
    const requirementsProfile = {
      version: "contract-v3",
      required_coverages,
      limits,
      endorsements,
      notes,
    };

    // ---------------------------------------------------------
    // 7) Save into vendors.requirements_json
    // ---------------------------------------------------------
    await sql`
      UPDATE vendors
      SET requirements_json = ${requirementsProfile}::jsonb,
          updated_at = NOW()
      WHERE id = ${vendorId}
    `;

    // ---------------------------------------------------------
    // 8) Timeline log
    // ---------------------------------------------------------
    try {
      await sql`
        INSERT INTO vendor_timeline (vendor_id, action, message, severity, created_at)
        VALUES (
          ${vendorId},
          'contract_requirements_synced_v1',
          ${'Contract-derived requirements profile saved to vendors.requirements_json.'},
          'info',
          NOW()
        );
      `;
    } catch (timelineErr) {
      console.error("[sync-requirements] timeline insert failed:", timelineErr);
    }

    // ---------------------------------------------------------
    // 9) Return profile
    // ---------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      requirementsProfile,
    });
  } catch (err) {
    console.error("[contracts/sync-requirements] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Contract → requirements sync failed.",
    });
  }
}
