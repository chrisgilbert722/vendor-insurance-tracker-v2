// pages/api/admin/timeline/index.js
// Admin compliance timeline — reads from vendor_timeline table
// Returns events for dashboard "System Timeline" widget

import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // Accept integer orgId (dashboard passes activeOrgId)
    const orgId = Number(req.query.orgId);

    // HARD GUARD — never crash UI, but still return data if no orgId
    // (for backwards compatibility with dashboard that doesn't pass orgId)
    const limit = Math.max(
      1,
      Math.min(500, Number(req.query.limit || 100))
    );

    let rows;

    if (Number.isInteger(orgId) && orgId > 0) {
      // Org-scoped query
      rows = await sql`
        SELECT
          t.id,
          t.vendor_id,
          t.action,
          t.message,
          t.severity,
          t.created_at,
          v.name AS vendor_name
        FROM vendor_timeline t
        LEFT JOIN vendors v ON v.id = t.vendor_id
        WHERE v.org_id = ${orgId}
        ORDER BY t.created_at DESC
        LIMIT ${limit};
      `;
    } else {
      // Fallback: return recent events across all orgs (for backwards compat)
      rows = await sql`
        SELECT
          t.id,
          t.vendor_id,
          t.action,
          t.message,
          t.severity,
          t.created_at,
          v.name AS vendor_name
        FROM vendor_timeline t
        LEFT JOIN vendors v ON v.id = t.vendor_id
        ORDER BY t.created_at DESC
        LIMIT ${limit};
      `;
    }

    return res.status(200).json({
      ok: true,
      timeline: rows || [],
    });
  } catch (err) {
    // NEVER bubble to UI
    console.error("[admin/timeline] swallowed error:", err);
    return res.status(200).json({
      ok: false,
      skipped: true,
      timeline: [],
    });
  }
}

