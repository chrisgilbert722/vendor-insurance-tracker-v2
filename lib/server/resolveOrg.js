// lib/server/resolveOrg.js
// 🚨 SERVER-ONLY — DO NOT IMPORT INTO CLIENT CODE

import "server-only";
import { sql } from "@db";

/**
 * Resolves public org UUID (external_uuid) -> internal org integer ID
 * - Accepts orgId from query OR body
 * - Never throws
 * - Safe for UI + API usage
 */
export async function resolveOrg(req, res) {
  const orgUuid =
    (typeof req.query?.orgId === "string" && req.query.orgId) ||
    (typeof req.body?.orgId === "string" && req.body.orgId) ||
    null;

  if (!orgUuid) {
    // Soft exit — do not break UI
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
    // Org not found — still soft exit
    res?.status?.(200)?.json?.({ ok: true, empty: true });
    return null;
  }

  return rows[0].id; // INTERNAL INTEGER org_id
}
