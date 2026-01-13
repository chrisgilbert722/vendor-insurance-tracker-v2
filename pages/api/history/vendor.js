// pages/api/history/vendor.js
// Fetch risk history for a vendor (server-side, build-safe)

import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  const { vendorId } = req.query;

  if (!vendorId) {
    return res.status(400).json({
      ok: false,
      error: "Missing vendorId",
    });
  }

  try {
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("risk_history")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      history: data || [],
    });
  } catch (err) {
    console.error("[history/vendor] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load vendor history",
    });
  }
}
