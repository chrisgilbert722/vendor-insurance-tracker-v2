// pages/api/auth/access-check.js
// ============================================================
// ACCESS CHECK API — Single endpoint for client-side access validation
// Returns: ALLOW | BLOCK_ONBOARDING | BLOCK_PAYWALL | BLOCK_NO_ORG
// ============================================================

import { supabaseServer } from "../../../lib/supabaseServer";
import { sql } from "../../../lib/db";
import { canAccessApp, ACCESS_STATUS } from "../../../lib/canAccessApp";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // Get auth token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(200).json({
        ok: true,
        status: "NO_SESSION",
        redirect: "/auth/login",
      });
    }

    // Verify user
    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(200).json({
        ok: true,
        status: "INVALID_SESSION",
        redirect: "/auth/login",
      });
    }

    const userId = data.user.id;

    // Get user's org
    const orgs = await sql`
      SELECT o.id
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC
      LIMIT 1;
    `;

    if (!orgs.length) {
      return res.status(200).json({
        ok: true,
        status: ACCESS_STATUS.BLOCK_NO_ORG,
        redirect: "/onboarding/ai-wizard",
      });
    }

    const orgId = orgs[0].id;

    // Check access using canAccessApp
    const accessResult = await canAccessApp(orgId);

    // Determine redirect based on status
    let redirect = null;
    switch (accessResult.status) {
      case ACCESS_STATUS.BLOCK_ONBOARDING:
        redirect = "/onboarding/ai-wizard";
        break;
      case ACCESS_STATUS.BLOCK_PAYWALL:
        redirect = "/billing/checkout";
        break;
      case ACCESS_STATUS.BLOCK_NO_ORG:
        redirect = "/onboarding/ai-wizard";
        break;
      case ACCESS_STATUS.ALLOW:
        redirect = null;
        break;
    }

    return res.status(200).json({
      ok: true,
      status: accessResult.status,
      redirect,
      subscription: accessResult.subscription || null,
      orgId,
    });
  } catch (err) {
    console.error("[access-check] Error:", err);
    return res.status(200).json({
      ok: true,
      status: ACCESS_STATUS.BLOCK_PAYWALL,
      redirect: "/billing/checkout",
      error: err.message,
    });
  }
}
