// pages/api/admin/vendors-lite.js
// Lightweight vendor list — includes status field
// Query params:
//   - includeAtRest=true to include at_rest vendors (default: active only)

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 🔒 Resolve external UUID → internal numeric org_id
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // Default: active vendors only
    const includeAtRest = req.query.includeAtRest === "true";

    let vendors;
    if (includeAtRest) {
      vendors = await sql`
        SELECT
          id,
          name AS vendor_name,
          COALESCE(status, 'active') as status
        FROM vendors
        WHERE org_id = ${orgId}
        ORDER BY status ASC, name ASC;
      `;
    } else {
      vendors = await sql`
        SELECT
          id,
          name AS vendor_name,
          COALESCE(status, 'active') as status
        FROM vendors
        WHERE org_id = ${orgId}
          AND (status IS NULL OR status = 'active')
        ORDER BY name ASC;
      `;
    }

    return res.status(200).json({
      ok: true,
      vendors: vendors || [],
    });
  } catch (err) {
    console.error("[vendors-lite] ERROR:", err);
    return res.status(200).json({
      ok: true,
      vendors: [], // 🔇 never break UI
    });
  }
}
