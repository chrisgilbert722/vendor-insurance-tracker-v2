// pages/api/contracts/sync-requirements.js
// ============================================================
// CONTRACT → REQUIREMENTS SYNC ENGINE — V2 (Full Automation)
//
// POST /api/contracts/sync-requirements
// Body: { vendorId, orgId? }
//
// Does:
// 1) Load vendor + contract_json
// 2) Extract coverage minimums & requirements from contract_json
// 3) Build a normalized array of requirements:
//    [
//      { coverage: "General Liability", min_required: "1000000", source: "contract-v2" },
//      { coverage: "Auto Liability", min_required: "1000000", source: "contract-v2" },
//      ...
//    ]
// 4) Save into vendors.requirements_json
// 5) Log a timeline event
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
        contract_json,
        requirements_json
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
      return res.status(400).json({
        ok: false,
        error: "Vendor has no org_id. orgId is required.",
      });
    }

    const contractJson = vendor.contract_json;
    if (!contractJson) {
      return res.status(400).json({
        ok: false,
        error: "No contract_json found. Run contract parser/matching first.",
      });
    }

    // ---------------------------------------------------------
    // 2) Extract coverage minimums from contract_json
    //    We support two patterns:
    //
    //    A) contract_json.coverage_minimums = {
    //         general_liability: 1000000,
    //         auto: 1000000,
    //         workers_comp: "required",
    //         umbrella: 5000000
    //       }
    //
    //    B) contract_json.requirements = [
    //         { label: "General Liability", value: "1,000,000" }, ...
    //       ]
    // ---------------------------------------------------------
    const coverageMin = contractJson.coverage_minimums || {};
    const reqArray = Array.isArray(contractJson.requirements)
      ? contractJson.requirements
      : [];

    const requirements = [];

    // Helper to normalize numeric strings
    function normalizeLimit(value) {
      if (value == null) return null;
      const asString = String(value);
      const numeric = asString.replace(/[^0-9.,]/g, "");
      return numeric || asString;
    }

    // Pattern A — coverage_minimums based
    if (coverageMin.general_liability) {
      requirements.push({
        coverage: "General Liability",
        min_required: normalizeLimit(coverageMin.general_liability),
        source: "contract-v2",
      });
    }
    if (coverageMin.auto) {
      requirements.push({
        coverage: "Auto Liability",
        min_required: normalizeLimit(coverageMin.auto),
        source: "contract-v2",
      });
    }
    if (coverageMin.workers_comp) {
      requirements.push({
        coverage: "Workers Compensation",
        min_required:
          coverageMin.workers_comp === "required"
            ? "Required"
            : normalizeLimit(coverageMin.workers_comp),
        source: "contract-v2",
      });
    }
    if (coverageMin.umbrella) {
      requirements.push({
        coverage: "Umbrella / Excess Liability",
        min_required: normalizeLimit(coverageMin.umbrella),
        source: "contract-v2",
      });
    }

    // Pattern B — requirements[] based (fallback/additional)
    for (const r of reqArray) {
      const label = r.label || r.name || "";
      const value = normalizeLimit(r.value || r.limit || null);
      if (!label || !value) continue;

      // If there is already a requirement for this coverage, skip to avoid duplicates
      const exists = requirements.some(
        (req) =>
          req.coverage.toLowerCase() === label.toLowerCase() &&
          (req.min_required || "").toString() === value.toString()
      );
      if (exists) continue;

      requirements.push({
        coverage: label,
        min_required: value,
        source: "contract-v2",
      });
    }

    // If nothing was extracted, fail gracefully
    if (!requirements.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        warning:
          "Contract JSON has no recognizable coverage_minimums or requirements. Nothing synced.",
        requirements: [],
      });
    }

    // ---------------------------------------------------------
    // 3) Save requirements into vendors.requirements_json
    // ---------------------------------------------------------
    await sql`
      UPDATE vendors
      SET
        requirements_json = ${JSON.stringify(requirements)}::jsonb,
        updated_at = NOW()
      WHERE id = ${vendorId}
    `;

    // ---------------------------------------------------------
    // 4) Timeline log
    // ---------------------------------------------------------
    try {
      await sql`
        INSERT INTO vendor_timeline (vendor_id, action, message, severity, created_at)
        VALUES (
          ${vendorId},
          'contract_requirements_synced_v2',
          ${'Contract coverage minimums synced into vendors.requirements_json.'},
          'info',
          NOW()
        );
      `;
    } catch (timelineErr) {
      console.error("[sync-requirements-v2] timeline insert failed:", timelineErr);
    }

    // ---------------------------------------------------------
    // 5) Return the resulting profile
    // ---------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      requirements,
    });
  } catch (err) {
    console.error("[contracts/sync-requirements-v2] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Contract → requirements sync failed.",
    });
  }
}
