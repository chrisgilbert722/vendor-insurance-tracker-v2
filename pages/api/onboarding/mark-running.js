// pages/api/onboarding/mark-running.js
// Lightweight status bump for the cockpit UI (SAFE)
// Purpose: drive /api/onboarding/status → green dot + animated bar

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export const runtime = "nodejs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) return res.status(200).json({ ok: true, skipped: true });

    // If org_onboarding_state exists, use it (preferred)
    await sql`
      UPDATE org_onboarding_state
      SET
        status = 'running',
        current_step = 'vendors_analyzed',
        progress = GREATEST(COALESCE(progress, 0), 65),
        updated_at = NOW()
      WHERE org_id = ${orgIdInt};
    `.catch(async () => {
      // If table doesn't exist, fail open
    });

    // Also bump organizations.onboarding_step forward if you're using that
    await sql`
      UPDATE organizations
      SET onboarding_step = GREATEST(COALESCE(onboarding_step, 0), 4)
      WHERE id = ${orgIdInt};
    `.catch(() => {});

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[mark-running] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
