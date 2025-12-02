// pages/api/org/list.js
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    // FIXED: correct Supabase query syntax
    const { data, error } = await supabaseServer
      .from("organization_members")
      .select("org_id, organizations(*)")   // JOIN org details
      .eq("user_id", userId);

    if (error) {
      console.error("[org/list] error", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    const orgs = data.map((row) => ({
      id: row.org_id,
      name: row.organizations?.name || "Organization",
      onboarding_step: row.organizations?.onboarding_step ?? 0,
    }));

    return res.status(200).json({ ok: true, orgs });
  } catch (err) {
    console.error("[org/list] exception", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
