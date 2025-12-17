import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    const rows = await sql`
      SELECT
        id,
        name AS vendor_name
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    return res.status(200).json({
      ok: true,
      vendors: rows || [],
    });
  } catch (err) {
    console.error("[vendors-lite]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
