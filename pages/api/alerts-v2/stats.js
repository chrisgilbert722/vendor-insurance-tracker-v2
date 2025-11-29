// pages/api/alerts-v2/stats.js
import { getAlertStatsV2 } from "../../../lib/alertsV2Engine";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId } = req.query;
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const stats = await getAlertStatsV2(Number(orgId));

    return res.status(200).json({ ok: true, stats });
  } catch (err) {
    console.error("[alerts-v2/stats] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
