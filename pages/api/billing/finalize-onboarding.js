// pages/api/billing/finalize-onboarding.js
// ============================================================
// AUTHORITATIVE ONBOARDING FINALIZATION
// Called after Stripe checkout success
// Sets onboarding_completed = true, NO EXCEPTIONS
// ============================================================

import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // Get auth token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing auth token" });
    }

    // Verify user
    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = data.user.id;

    // Get user's org
    const orgs = await sql`
      SELECT o.id, o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC
      LIMIT 1;
    `;

    if (!orgs.length) {
      return res.status(400).json({ ok: false, error: "No organization found" });
    }

    const orgId = orgs[0].id;
    const now = new Date().toISOString();

    // AUTHORITATIVE UPDATE - No conditions, no checks
    // Stripe success = onboarding complete
    await sql`
      UPDATE organizations
      SET
        onboarding_completed = true,
        onboarding_step = 999,
        trial_started_at = COALESCE(trial_started_at, ${now}),
        trial_expires_at = COALESCE(trial_expires_at, ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()})
      WHERE id = ${orgId};
    `;

    console.log("[finalize-onboarding] Onboarding finalized for org:", orgId);

    return res.status(200).json({
      ok: true,
      finalized: true,
      orgId,
    });
  } catch (err) {
    console.error("[finalize-onboarding] Error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
