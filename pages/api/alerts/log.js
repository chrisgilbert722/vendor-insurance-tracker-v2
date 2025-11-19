// pages/api/alerts/log.js
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { vendorId, orgId, type, message } = req.body;

    const { data, error } = await supabase
      .from("alerts")
      .insert([{ vendor_id: vendorId, org_id: orgId, type, message }]);

    if (error) throw error;

    return res.status(200).json({ ok: true, alert: data[0] });
  } catch (err) {
    console.error("ALERT LOG ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
