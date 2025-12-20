// pages/api/onboarding/status.js
// UUID-safe, skip-safe onboarding status (NO 500s)

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // 🔑 Resolve external_uuid -> internal INT id
    const orgIdInt = await resolveOrg(req, res);

    // Soft exit if org not resolvable
    if (!orgIdInt) {
      return res.status(200).json({
        ok: false,
        skipped: true,
      });
    }

    const rows = await sql`
      SELECT onboarding_step, dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${orgIdInt}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        ok: false,
        skipped: true,
      });
    }

    const org = rows[0];

    const onboardingStep = Number(org.onboarding_step || 0);
    const onboardingComplete = onboardingStep >= 6;

    return res.status(200).json({
      ok: true,
      onboardingComplete,
      onboardingStep,
      dashboardTutorialEnabled:
        org.dashboard_tutorial_enabled === true,
    });
  } catch (err) {
    // NEVER bubble to UI
    console.error("[onboarding/status] swallowed error:", err);
    return res.status(200).json({
      ok: false,
      skipped: true,
    });
  }
}
