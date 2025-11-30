// pages/api/renewals/forecast.js
// Auto-Predictive Renewal Forecasting (Risk ML) API

import { buildRenewalForecastForOrg } from "../../../lib/renewalRiskModel";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Use GET" });
  }

  try {
    const orgId = Number(req.query.orgId || 0);
    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    const forecast = await buildRenewalForecastForOrg(orgId);

    return res.status(200).json({
      ok: true,
      forecast,
    });
  } catch (err) {
    console.error("[renewals/forecast] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
