// pages/api/alerts-v2/timeline.js
// UUID-safe timeline endpoint (direct SQL, NO engine import)

import { sql } from "../../../lib/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOrgId(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return UUID_RE.test(s) ? s : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const orgId = cleanOrgId(req.query.orgId);
    if (!orgId) {
      return res.status(200).json({ ok: false, skipped: true, items: [] });
    }

    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));

    const rows = await sql`
      SELECT
        created_at,
        severity,
        type,
        message,
        vendor_id
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
        AND created_at >= NOW() - (${days}::int || ' days')::interval
      ORDER BY created_at DESC
      LIMIT 200;
    `;

    return res.status(200).json({ ok: true, items: rows || [] });
  } catch (err) {
    console.error("[alerts-v2/timeline] error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error",
    });
  }
}

