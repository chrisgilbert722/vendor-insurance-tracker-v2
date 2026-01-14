// pages/api/onboarding/complete.js
// FINALIZE ONBOARDING — FAIL-OPEN
// - Never blocks dashboard access
// - Marks onboarding complete if possible
// - Safe even if auth session is missing

import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const supabase = supabaseServer();

    // Try to get user — FAIL OPEN
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // 🔓 FAIL-OPEN: allow dashboard anyway
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "No auth session — onboarding marked complete client-side",
      });
    }

    // Find user's org
    const orgRows = await sql`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
      LIMIT 1;
    `;

    if (orgRows.length) {
      const orgId = orgRows[0].org_id;

      await sql`
        UPDATE organizations
        SET onboarding_completed = true
        WHERE id = ${orgId};
      `;
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[onboarding/complete]", err);

    // 🔓 NEVER BLOCK UI
    return res.status(200).json({
      ok: true,
      skipped: true,
      error: err.message,
    });
  }
}
