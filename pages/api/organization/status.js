// pages/api/organization/status.js
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  try {
    const supabase = supabaseServer(req, res);

    // Pull user session from cookies
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return res.status(200).json({ ok: false, error: "Missing user" });
    }

    const userId = session.user.id;

    // Load the user's org
    const { data, error } = await supabase
      .from("org_members") // ✅ FIXED TABLE
      .select(`
        org_id,
        organization:organization(*)
      `)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[status] org load error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    if (!data?.organization) {
      return res.status(200).json({
        ok: false,
        error: "User has no linked organization",
      });
    }

    // Extract onboarding_step safely
    const onboarding_step = data.organization.onboarding_step ?? 0;

    return res.status(200).json({
      ok: true,
      orgId: data.org_id,
      onboarding_step,
    });

  } catch (err) {
    console.error("[organization/status] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
