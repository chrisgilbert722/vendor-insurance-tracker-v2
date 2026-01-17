// pages/api/vendors/index.js
// Vendor Index — UI SAFE
// Supports status filtering (default: active only)
// Query params:
//   - includeAtRest=true to include at_rest vendors
//   - status=active|at_rest to filter specific status
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

    // Status filtering
    const includeAtRest = req.query.includeAtRest === "true";
    const statusFilter = req.query.status; // 'active' or 'at_rest'

    let vendors;

    if (statusFilter === "at_rest") {
      // Only at_rest vendors
      vendors = await sql`
        SELECT
          id, name, email, org_id, created_at,
          COALESCE(status, 'active') as status
        FROM vendors
        WHERE org_id = ${orgId}
          AND status = 'at_rest'
        ORDER BY name ASC;
      `;
    } else if (includeAtRest) {
      // All vendors (active + at_rest)
      vendors = await sql`
        SELECT
          id, name, email, org_id, created_at,
          COALESCE(status, 'active') as status
        FROM vendors
        WHERE org_id = ${orgId}
        ORDER BY status ASC, name ASC;
      `;
    } else {
      // Default: active vendors only
      vendors = await sql`
        SELECT
          id, name, email, org_id, created_at,
          COALESCE(status, 'active') as status
        FROM vendors
        WHERE org_id = ${orgId}
          AND (status IS NULL OR status = 'active')
        ORDER BY name ASC;
      `;
    }

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
