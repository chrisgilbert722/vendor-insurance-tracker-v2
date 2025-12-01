// lib/getUserOrg.js
// Safely extract the current user's orgId from Supabase session.
// This matches your existing UserContext + auth flow.

import { supabase } from "./supabaseClient";
import { sql } from "./db";

export async function getUserOrg(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new Error("No auth token provided.");
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new Error("Invalid or expired session.");
    }

    const userId = data.user.id;

    // Look up user's organization membership
    const rows = await sql`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${userId}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      throw new Error("User has no organization assigned.");
    }

    return { orgId: rows[0].org_id, userId };
  } catch (err) {
    console.error("[getUserOrg] error:", err.message);
    res.status(401).json({ ok: false, error: err.message });
    throw err;
  }
}
