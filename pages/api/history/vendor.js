// pages/api/history/vendor.js
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  const { vendorId } = req.query;

  try {
    const { data, error } = await supabase
      .from("risk_history")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({ ok: true, history: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
