// pages/api/renewals/expiring.js
// ============================================================
// RENEWAL EXPIRING API — ORG-SCOPED (NO FALLBACKS)
// Returns renewals expiring within X days for a specific org
// ============================================================

import { sql } from "../../../lib/db";
import { classifyRenewal } from "../../../lib/classifyRenewal";

export default async function handler(req, res) {
  try {
    const range = Number(req.query.range || 90);
    const orgId = req.query.orgId ? Number(req.query.orgId) : null;

    // REQUIRE orgId — no cross-org data leakage
    if (!orgId || !Number.isInteger(orgId)) {
      return res.status(200).json({ ok: true, data: [] });
    }

    // ORG-SCOPED QUERY — only return policies for ACTIVE vendors
    const rows = await sql`
      SELECT
        p.id AS policy_id,
        p.vendor_id,
        p.coverage_type,
        p.expiration_date,
        v.name AS vendor_name
      FROM policies p
      INNER JOIN vendors v ON v.id = p.vendor_id
      WHERE p.org_id = ${orgId}
        AND p.expiration_date IS NOT NULL
        AND (v.status IS NULL OR v.status = 'active')
    `;

    const now = new Date();

    const expiring = rows.filter((p) => {
      const d = new Date(p.expiration_date);
      const diff = Math.floor((d - now) / 86400000);
      return diff <= range;
    });

    const mapped = expiring.map((p) => ({
      ...p,
      status: classifyRenewal(p.expiration_date),
    }));

    return res.status(200).json({ ok: true, data: mapped });
  } catch (err) {
    console.error("[renewals/expiring] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
