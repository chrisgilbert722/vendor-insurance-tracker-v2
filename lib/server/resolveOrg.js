// lib/server/resolveOrg.js
// ============================================================
// RESOLVE ORG — Accepts either external_uuid (UUID) or id (integer)
// Returns integer org ID for database queries
// ============================================================
import "server-only";
import { sql } from "@db";

export async function resolveOrg(req, res) {
  const orgIdParam =
    (typeof req.query?.orgId === "string" && req.query.orgId) ||
    (typeof req.body?.orgId === "string" && req.body.orgId) ||
    null;

  if (!orgIdParam) {
    res?.status?.(200)?.json?.({ ok: true, empty: true });
    return null;
  }

  // Check if it's an integer ID or UUID
  const isInteger = /^\d+$/.test(orgIdParam);

  if (isInteger) {
    // Passed integer ID - verify it exists and return it
    const rows = await sql`
      SELECT id
      FROM organizations
      WHERE id = ${parseInt(orgIdParam, 10)}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      res?.status?.(200)?.json?.({ ok: true, empty: true });
      return null;
    }

    return rows[0].id;
  }

  // Passed UUID - look up by external_uuid
  const rows = await sql`
    SELECT id
    FROM organizations
    WHERE external_uuid = ${orgIdParam}
    LIMIT 1;
  `;

  if (!rows || rows.length === 0) {
    res?.status?.(200)?.json?.({ ok: true, empty: true });
    return null;
  }

  return rows[0].id;
}
