// pages/api/alerts/get.js
// Backwards-compatible wrapper that reads from Alerts V2

import { listAlertsV2 } from "../../../lib/alertsV2Engine";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId } = req.query;
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const alerts = await listAlertsV2({
      orgId: Number(orgId),
      vendorId: null,
      limit: 100,
    });

    return res.status(200).json({ ok: true, alerts });
  } catch (err) {
    console.error("[alerts/get wrapper] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
