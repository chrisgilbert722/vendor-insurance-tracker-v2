// lib/server/resolveOrg.js
import "server-only";
import { sql } from "@db";

export async function resolveOrg(req, res) {
  const orgUuid =
    (typeof req.query?.orgId === "string" && req.query.orgId) ||
    (typeof req.body?.orgId === "string" && req.body.orgId) ||
    null;

  if (!orgUuid) {
    res?.status?.(200)?.json?.({ ok: true, empty: true });
    return null;
  }

  const rows = await sql`
    SELECT id
    FROM organizations
    WHERE external_uuid = ${orgUuid}
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) {
    res?.status?.(200)?.json?.({ ok: true, empty: true });
    return null;
  }

  return rows[0].id;
}
