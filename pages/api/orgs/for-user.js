import { sql } from "../../../lib/db";
import { getUserFromRequest } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ ok: false });

    const rows = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members m
      JOIN organizations o ON o.id = m.org_id
      WHERE m.user_id = ${user.id}
      ORDER BY o.id ASC;
    `;

    res.json({ ok: true, orgs: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
}
