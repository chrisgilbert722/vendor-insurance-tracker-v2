// pages/api/org/list.js
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  try {
    const supabase = supabaseServer(req, res);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return res.status(200).json({ ok: false, error: "Missing userId" });
    }

    const userId = session.user.id;

    // FIXED: relationship name
    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        org_id,
        organizations:organizations(*)
      `)
      .eq("user_id", userId);

    if (error) throw error;

    // Return ONLY org rows
    const orgs = data.map((row) => row.organizations);

    return res.status(200).json({ ok: true, orgs });
  } catch (err) {
    console.error("[org/list] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
