import { sql } from "./db";

/**
 * Resolves external org UUID -> internal org integer ID
 */
export async function resolveOrg(req, res) {
  const orgUuid = req.query?.orgId;

  // Org not ready / switching / bootstrap
  if (!orgUuid || typeof orgUuid !== "string") {
    res.status(200).json({ ok: true, empty: true });
    return null;
  }

  const rows = await sql`
    SELECT id
    FROM organizations
    WHERE uuid = ${orgUuid}
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) {
    res.status(200).json({ ok: true, empty: true });
    return null;
  }

  // 🔑 INTERNAL INTEGER org_id used by all DB tables
  return rows[0].id;
}
