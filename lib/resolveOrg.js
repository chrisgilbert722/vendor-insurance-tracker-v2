import { sql } from "./db";

/**
 * Resolves external org UUID -> internal org integer ID
 */
export async function resolveOrg(req, res) {
  const orgUuid = req.query?.orgId;

  if (!orgUuid || typeof orgUuid !== "string") {
    res.status(200).json({ ok: true, empty: true });
    return null;
  }

  const rows = await sql`
    SELECT id
    FROM orgs
    WHERE uuid = ${orgUuid}
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) {
    res.status(200).json({ ok: true, empty: true });
    return null;
  }

  return rows[0].id; // 🔑 INTEGER org_id
}
