// pages/api/alerts-v2/aging.js
import { sql } from "../../../lib/db";

/* ------------------------------------------------------------
   UUID GUARD
------------------------------------------------------------ */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOrgId(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return UUID_RE.test(s) ? s : null;
}

export default async function handler(req, res) {
  try {
    const safeOrgId = cleanOrgId(req.query.orgId);

    // 🚫 HARD GUARD — prevent dashboard spam
    if (!safeOrgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Missing or invalid orgId",
      });
    }

    // Unresolved alerts only (UUID SAFE)
    const rows = await sql`
      SELECT created_at
      FROM alerts_v2
      WHERE org_id = ${safeOrgId}
        AND resolved_at IS NULL;
    `;

    if (rows.length === 0) {
      return res.status(200).json({
        ok: true,
        aging: {
          oldest: 0,
          avgAge: 0,
          over7: 0,
          over30: 0,
        },
      });
    }

    const now = new Date();
    const ages = rows.map((r) => {
      const created = new Date(r.created_at);
      return Math.floor((now - created) / (1000 * 60 * 60 * 24));
    });

    const oldest = Math.max(...ages);
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;

    const over7 = ages.filter((d) => d >= 7).length;
    const over30 = ages.filter((d) => d >= 30).length;

    return res.status(200).json({
      ok: true,
      aging: {
        oldest,
        avgAge: Math.round(avgAge),
        over7,
        over30,
      },
    });
  } catch (err) {
    console.error("[alerts-v2/aging] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
