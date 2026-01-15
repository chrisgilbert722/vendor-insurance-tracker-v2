import { sql } from "../../../lib/db";
import { requireApiKey } from "../../../lib/apiAuth";

export default async function handler(req, res) {
  try {
    const orgId = await requireApiKey(req);

    const vendors = await sql`
      SELECT id, name AS vendor_name, status
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name
    `;

    res.status(200).json({ ok: true, vendors });
  } catch (err) {
    res.status(401).json({ ok: false, error: err.message });
  }
}
