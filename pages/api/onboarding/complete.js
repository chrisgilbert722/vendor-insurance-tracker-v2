// pages/api/onboarding/complete.js
// ============================================================
// FINAL ONBOARDING STEP — MARK COMPLETE (UUID SAFE)
// ============================================================

import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const supabase = supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    const { orgId } = req.body || {};
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // Resolve UUID → internal org ID
    const rows = await sql`
      SELECT id
      FROM organizations
      WHERE external_uuid = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.status(400).json({ ok: false, error: "Org not found" });
    }

    const orgIdInt = rows[0].id;

    // Mark onboarding complete
    await sql`
      UPDATE organizations
      SET
        onboarding_completed = true,
        onboarding_step = 10,
        updated_at = NOW()
      WHERE id = ${orgIdInt};
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[onboarding/complete]", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
