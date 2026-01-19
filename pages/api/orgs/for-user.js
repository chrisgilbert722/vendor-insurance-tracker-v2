// pages/api/orgs/for-user.js
// ============================================================
// GET USER'S ORGANIZATIONS — Returns all orgs for authenticated user
// ============================================================

import { sql } from "../../../lib/db";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      orgs: [],
      error: "Method not allowed",
    });
  }

  try {
    // Use session-based auth via cookies
    const supabase = createPagesServerClient({ req, res });
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return res.status(200).json({
        ok: true,
        orgs: [],
        hasOrg: false,
        authenticated: false,
      });
    }

    const userId = data.user.id;

    const orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid,
        o.onboarding_step,
        o.onboarding_completed
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC;
    `;

    return res.status(200).json({
      ok: true,
      orgs: orgs || [],
      hasOrg: orgs && orgs.length > 0,
      authenticated: true,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(200).json({
      ok: true,
      orgs: [],
      hasOrg: false,
      error: err.message,
    });
  }
}
