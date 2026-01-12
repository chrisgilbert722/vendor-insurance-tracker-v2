// ============================================================
// ONBOARDING RESET — ADMIN / DEV TOOL
// - Resets onboarding to Step 1
// - Does NOT delete business data
// - Safe for reuse during testing
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // Resolve org from session / body
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Unable to resolve organization",
      });
    }

    // 1️⃣ Reset org onboarding flags
    await sql`
      UPDATE organizations
      SET
        onboarding_step = 0,
        onboarding_completed = FALSE,
        dashboard_tutorial_enabled = FALSE
      WHERE id = ${orgId};
    `;

    // 2️⃣ Reset autopilot state
    await sql`
      DELETE FROM org_onboarding_state
      WHERE org_id = ${orgId};
    `;

    return res.status(200).json({
      ok: true,
      message: "Onboarding reset to Step 1",
      org_id: orgId,
    });
  } catch (err) {
    console.error("[onboarding/reset]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to reset onboarding",
    });
  }
}
