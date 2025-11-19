// pages/api/history/save.js
import { supabase } from "../../../lib/supabaseClient";

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
    } = req.body;

    const { data, error } = await supabase
      .from("risk_history")
      .insert([
        {
          vendor_id: vendorId,
          org_id: orgId,
          risk_score: riskScore,
          elite_status: eliteStatus,
          days_left: daysLeft
        }
      ]);

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Risk history save error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
