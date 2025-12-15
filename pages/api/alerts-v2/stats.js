// pages/api/alerts-v2/stats.js
import { getAlertStatsV2 } from "../../../lib/alertsV2Engine";

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
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, includeResolved } = req.query;

    const safeOrgId = cleanOrgId(orgId);

    // 🚫 HARD GUARD — prevent dashboard auto-load spam
    if (!safeOrgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Missing or invalid orgId",
      });
    }

    const allowResolved =
      String(includeResolved || "").toLowerCase() === "true" ||
      String(includeResolved || "") === "1";

    // ✅ UUID SAFE — DO NOT CAST
    const stats = await getAlertStatsV2(safeOrgId);

    // 🔒 DEFAULT: hide resolved alerts from counts
    const filtered = allowResolved
      ? stats
      : {
          ...stats,
          total: stats.total - (stats.resolved || 0),
          critical: stats.critical - (stats.resolvedCritical || 0),
          high: stats.high - (stats.resolvedHigh || 0),
          medium: stats.medium - (stats.resolvedMedium || 0),
          low: stats.low - (stats.resolvedLow || 0),
        };

    return res.status(200).json({ ok: true, stats: filtered });
  } catch (err) {
    console.error("[alerts-v2/stats] error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error",
    });
  }
}
