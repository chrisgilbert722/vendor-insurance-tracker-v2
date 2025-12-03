// pages/api/renewals/sla.js

import { sql } from "../../../lib/db";
import { classifyRenewal } from "../../../lib/classifyRenewal";
import { computeRenewalSlaBuckets } from "../../../lib/renewalSla";

export default async function handler(req, res) {
  try {
    const orgId = Number(req.query.orgId || 0);
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const rows = await sql`
      SELECT 
        p.id AS policy_id,
        p.vendor_id,
        p.coverage_type,
        p.expiration_date,
        v.name AS vendor_name
      FROM policies p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE p.org_id = ${orgId}
        AND p.expiration_date IS NOT NULL;
    `;

    const enriched = rows.map((r) => ({
      ...r,
      status: classifyRenewal(r.expiration_date),
    }));

    const buckets = computeRenewalSlaBuckets(enriched);

    return res.status(200).json({
      ok: true,
      buckets,
      total: enriched.length,
    });
  } catch (err) {
    console.error("[renewals/sla] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
