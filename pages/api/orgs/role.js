import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { getUserFromRequest } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    // -------------------------------------------------
    // 🔐 Authenticate user (REQUIRED)
    // -------------------------------------------------
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "Not authenticated",
      });
    }

    // -------------------------------------------------
    // 🧠 Validate orgId (MUST be integer)
    // -------------------------------------------------
    const rawOrgId = req.query.orgId;
    const orgId = Number(rawOrgId);

    if (!Number.isInteger(orgId)) {
      return res.status(400).json({
        ok: false,
        error: "Invalid orgId",
      });
    }

    // -------------------------------------------------
    // 🎯 Lookup role from org_members
    // -------------------------------------------------
    const { data, error } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (error || !data?.role) {
      // IMPORTANT: do NOT 401 here — user may simply be viewer
      return res.status(200).json({
        ok: true,
        role: "viewer",
      });
    }

    return res.status(200).json({
      ok: true,
      role: data.role,
    });

  } catch (err) {
    console.error("[api/orgs/role] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
