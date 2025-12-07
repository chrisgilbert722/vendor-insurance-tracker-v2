// pages/api/vendor/save-requirements.js
// Save a V5 requirements profile into vendors.requirements_json

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

    if (!requirementsProfile) {
      return res.status(400).json({
        ok: false,
        error: "requirementsProfile payload is required.",
      });
    }

    const vendorIdInt = parseInt(vendorId, 10);
    const orgIdInt = parseInt(orgId, 10);

    if (Number.isNaN(vendorIdInt) || Number.isNaN(orgIdInt)) {
      return res.status(400).json({
        ok: false,
        error: "vendorId and orgId must be numbers.",
      });
    }

    const rows = await sql`
      UPDATE vendors
      SET
        requirements_json = ${requirementsProfile},
        updated_at = NOW()
      WHERE id = ${vendorIdInt}
        AND org_id = ${orgIdInt}
      RETURNING id, org_id, requirements_json;
    `;

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found for this org.",
      });
    }

    return res.status(200).json({
      ok: true,
      vendor: rows[0],
    });
  } catch (err) {
    console.error("[save-requirements ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error.",
    });
  }
}
