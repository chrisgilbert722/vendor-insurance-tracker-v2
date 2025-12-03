// pages/api/renewals/predict-org-v1.js
// Returns all renewal_predictions for an org (for heatmap/dashboards)

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const rows = await sql`
      SELECT 
        rp.vendor_id, 
        rp.org_id,
        rp.risk_score,
        rp.risk_tier,
        rp.likelihood_on_time,
        rp.likelihood_late,
        rp.likelihood_fail,
        v.name as vendor_name
      FROM renewal_predictions rp
      JOIN vendors v ON v.id = rp.vendor_id
      WHERE rp.org_id = ${orgId}
      ORDER BY rp.risk_score DESC;
    `;

    return res.status(200).json({
      ok: true,
      orgId,
      predictions: rows,
    });
  } catch (err) {
    console.error("[predict-org-v1] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
