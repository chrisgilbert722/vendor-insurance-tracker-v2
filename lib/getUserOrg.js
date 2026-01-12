// lib/getUserOrg.js
// Safely extract the current user's orgId from Supabase session (SERVER-ONLY).

import { supabaseServer } from "@/lib/supabaseServer";
import { sql } from "@db";

export async function getUserOrg(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ ok: false, error: "No auth token provided." });
    }

    const supabase = supabaseServer();

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res
        .status(401)
        .json({ ok: false, error: "Invalid or expired session." });
    }

    const userId = data.user.id;

    // Look up user's organization membership
    const rows = await sql`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${userId}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return res
        .status(403)
        .json({ ok: false, error: "User has no organization assigned." });
    }

    return { orgId: rows[0].org_id, userId };
  } catch (err) {
    console.error("[getUserOrg] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Internal server error" });
  }
}
