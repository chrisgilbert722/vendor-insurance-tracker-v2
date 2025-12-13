// pages/api/alerts-v2/stats.js
import { getAlertStatsV2 } from "../../../lib/alertsV2Engine";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, includeResolved } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const allowResolved =
      String(includeResolved || "").toLowerCase() === "true" ||
      String(includeResolved || "") === "1";

    const stats = await getAlertStatsV2(Number(orgId));

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
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
