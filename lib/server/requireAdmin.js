// lib/server/requireAdmin.js
// ============================================================
// SERVER-SIDE ADMIN ROLE CHECK
// - Validates user has admin role for the org
// - Returns { ok: true, userId } on success
// - Returns { ok: false, error: string } on failure
// ============================================================

import "server-only";
import { sql } from "@db";
import { supabaseServer } from "../supabaseServer";

/**
 * Checks if the requesting user has admin role for the given org.
 *
 * @param {Request} req - Next.js API request
 * @param {number} orgIdInt - Internal org ID (from resolveOrg)
 * @returns {Promise<{ ok: boolean, userId?: string, error?: string }>}
 */
export async function requireAdmin(req, orgIdInt) {
  // 1. Extract auth token
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return { ok: false, error: "Authentication required" };
  }

  // 2. Validate token and get user ID
  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) {
    return { ok: false, error: "Invalid or expired session" };
  }

  const userId = data.user.id;

  // 3. Check admin role in org_members
  const rows = await sql`
    SELECT role
    FROM org_members
    WHERE org_id = ${orgIdInt}
      AND user_id = ${userId}
    LIMIT 1;
  `;

  const role = rows[0]?.role || null;

  if (role !== "admin") {
    return { ok: false, error: "Admin access required" };
  }

  return { ok: true, userId };
}
