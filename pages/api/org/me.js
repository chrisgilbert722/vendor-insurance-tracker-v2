// pages/api/org/me.js
import { createServerClient } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  const supabase = createServerClient(req, res);

  // 1. Get the current user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  }

  // 2. Load org memberships
  const { data: memberships, error: memberError } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id);

  if (memberError) {
    return res.status(500).json({ ok: false, error: memberError.message });
  }

  if (!memberships || memberships.length === 0) {
    return res.status(404).json({ ok: false, error: "No organization found" });
  }

  // If user has multiple orgs, take the first one (or add switcher later)
  const active = memberships[0];

  return res.status(200).json({
    ok: true,
    org: {
      id: active.org_id,
      role: active.role,
    },
  });
}
