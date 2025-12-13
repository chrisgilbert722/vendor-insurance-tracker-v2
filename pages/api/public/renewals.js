import { sql } from "../../../lib/db";
import { requireApiKey } from "../../../lib/apiAuth";

export default async function handler(req, res) {
  try {
    const orgId = await requireApiKey(req);

    const rows = await sql`
      SELECT
        v.id AS vendor_id,
        v.vendor_name,
        r.coverage_type,
        r.expiration_date,
        r.last_stage,
        r.status
      FROM policy_renewal_schedule r
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.org_id = ${orgId}
      ORDER BY r.expiration_date
    `;

    res.json({ ok: true, renewals: rows });
  } catch (err) {
    res.status(401).json({ ok: false, error: err.message });
  }
}
