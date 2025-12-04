// pages/api/alerts/log.js
// Backwards-compatible wrapper: logs into Alerts V2 as "system" alerts

import { insertAlertV2Safe } from "../../../lib/alertsV2Engine";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { vendorId, orgId, type, message } = req.body;

    if (!vendorId || !orgId || !type || !message) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId, orgId, type, or message",
      });
    }

    await insertAlertV2Safe({
      orgId: Number(orgId),
      vendorId: Number(vendorId),
      type,
      severity: "medium",
      category: "system",
      message,
      ruleId: null,
      metadata: {},
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[alerts/log wrapper] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
