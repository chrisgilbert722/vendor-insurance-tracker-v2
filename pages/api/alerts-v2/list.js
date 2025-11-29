// pages/api/alerts-v2/list.js
import { listAlertsV2 } from "../../../lib/alertsV2Engine";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try:
    const { orgId, vendorId, limit } = req.query;
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const limitNum = limit ? Number(limit) : 100;

    const alerts = await listAlertsV2({
      orgId: Number(orgId),
      vendorId: vendorId ? Number(vendorId) : null,
      limit: limitNum,
    });

    return res.status(200).json({ ok: true, alerts });
  } catch (err) {
    console.error("[alerts-v2/list] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
