// pages/api/alerts-v2/generate.js
import { generateAlertsForOrg } from "../../../lib/alertsV2Engine";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId } = req.body;
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    await generateAlertsForOrg(orgId);

    return res.status(200).json({ ok: true, message: "Alerts V2 generated." });
  } catch (err) {
    console.error("[alerts-v2/generate] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Internal error" });
  }
}
