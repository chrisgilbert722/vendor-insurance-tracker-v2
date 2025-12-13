import { sql } from "../../../lib/db";
import { requireApiKey } from "../../../lib/apiAuth";

export default async function handler(req, res) {
  try {
    const orgId = await requireApiKey(req);

    const vendors = await sql`
      SELECT id, vendor_name, status
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY vendor_name
    `;

    res.json({ ok: true, vendors });
  } catch (err) {
    res.status(401).json({ ok: false, error: err.message });
  }
}
