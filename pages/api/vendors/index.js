// pages/api/vendors/index.js
// Vendor Index — UI SAFE
// Guarantees `status` exists for Vendors page
// Supports both UUID (resolveOrg) and integer orgId

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // Support integer orgId directly (for upload-coi vendor picker)
    const queryOrgId = req.query.orgId;
    let orgId = null;

    if (queryOrgId && /^\d+$/.test(queryOrgId)) {
      // Integer orgId provided directly
      orgId = parseInt(queryOrgId, 10);
    } else {
      // Use resolveOrg for UUID-based resolution
      orgId = await resolveOrg(req, res);
    }

    if (!orgId) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    const vendors = await sql`
      SELECT
        id,
        name,
        email,
        org_id,
        created_at
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    return res.status(200).json({
      ok: true,
      vendors,
    });
  } catch (err) {
    console.error("[api/vendors/index]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
