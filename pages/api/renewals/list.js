// pages/api/renewals/list.js

import { sql } from "../../../lib/db";
import { computeRenewalStage } from "../../../lib/renewalEngineV2";

export default async function handler(req, res) {
  try {
    const orgId = Number(req.query.orgId || 0);

    const rows = await sql`
      SELECT prs.*, v.name AS vendor_name
      FROM policy_renewal_schedule prs
      JOIN vendors v ON v.id = prs.vendor_id
      WHERE prs.org_id = ${orgId}
        AND prs.status = 'active'
      ORDER BY prs.expiration_date ASC;
    `;

    const now = new Date();

    const out = rows.map((r) => {
      const exp = new Date(r.expiration_date);
      const daysLeft = Math.floor((exp - now) / 86400000);
      return {
        ...r,
        days_left: daysLeft,
        stage: computeRenewalStage(r),
      };
    });

    return res.status(200).json({ ok: true, rows: out });
  } catch (err) {
    console.error("[renewals/list] ERR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
