// pages/api/requirements/index.js
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const { data, error } = await supabase
      .from("requirements")
      .select("*")
      .eq("org_id", orgId)
      .order("coverage_type", { ascending: true });

    if (error) {
      console.error("Requirements list error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, requirements: data || [] });
  }

  if (req.method === "POST") {
    const {
      id,
      orgId,
      coverage_type,
      min_limit_each_occurrence,
      min_limit_aggregate,
      require_additional_insured,
      require_waiver,
      min_risk_score,
      notes,
    } = req.body;

    if (!orgId || !coverage_type) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId or coverage_type" });
    }

    const payload = {
      org_id: orgId,
      coverage_type,
      min_limit_each_occurrence,
      min_limit_aggregate,
      require_additional_insured,
      require_waiver,
      min_risk_score,
      notes,
    };

    if (id) payload.id = id;

    const { data, error } = await supabase
      .from("requirements")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Requirements upsert error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, requirement: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing id" });
    }

    const { error } = await supabase
      .from("requirements")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Requirements delete error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
