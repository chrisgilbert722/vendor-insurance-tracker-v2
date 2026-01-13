// pages/api/history/save.js
// Persist vendor risk history snapshot (server-side)

import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const {
      vendorId,
      orgId,
      riskScore,
      eliteStatus,
      daysLeft
    } = req.body || {};

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId",
      });
    }

    const supabase = supabaseServer();

    const { error } = await supabase
      .from("risk_history")
      .insert([
        {
          vendor_id: vendorId,
          org_id: orgId,
          risk_score: riskScore ?? null,
          elite_status: eliteStatus ?? null,
          days_left: daysLeft ?? null,
        }
      ]);

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Risk history save error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to save risk history",
    });
  }
}
