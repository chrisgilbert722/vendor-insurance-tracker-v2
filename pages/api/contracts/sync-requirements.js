// pages/api/contracts/sync-requirements.js
// ============================================================
// CONTRACT → REQUIREMENTS SYNC ENGINE — V2 (Full Automation)
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
      return res.status(404).json({ ok: false, error: "Vendor not found." });
    }

    const vendor = vendorRows[0];
    if (!orgId) orgId = vendor.org_id;

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Vendor has no org_id. orgId is required." });
    }

    const contractJson = vendor.contract_json;
    if (!contractJson) {
      return res.status(400).json({
        ok: false,
        error: "No contract_json found. Run contract parser/matching first.",
      });
    }

    const coverageMin = contractJson.coverage_minimums || {};
    const reqArray = Array.isArray(contractJson.requirements)
      ? contractJson.requirements
      : [];

    const requirements = [];

    function normalizeLimit(value) {
      if (value == null) return null;
      const cleaned = String(value).replace(/[^0-9.,]/g, "");
      return cleaned || String(value);
    }

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

    for (const r of reqArray) {
      const label = r.label || r.name || "";
      const value = normalizeLimit(r.value || r.limit || null);
      if (!label || !value) continue;

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

    if (!requirements.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        warning:
          "Contract JSON has no recognizable minimums. Nothing synced.",
        requirements: [],
      });
    }

    await sql`
      UPDATE vendors
      SET
        requirements_json = ${JSON.stringify(requirements)}::jsonb,
        updated_at = NOW()
      WHERE id = ${vendorId}
    `;

    try {
      await sql`
        INSERT INTO vendor_timeline (vendor_id, action, message, severity, created_at)
        VALUES (
          ${vendorId},
          'contract_requirements_synced_v2',
          ${"Contract coverage minimums synced into vendors.requirements_json."},
          'info',
          NOW()
        );
      `;
    } catch (err) {
      console.error("[sync-requirements-v2] timeline insert failed:", err);
    }

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
