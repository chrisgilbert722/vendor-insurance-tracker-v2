// pages/api/alerts/get.js
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  const { orgId } = req.query;

  try {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.status(200).json({ ok: true, alerts: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
