// pages/api/onboarding/status.js
// ============================================================
// UUID-safe onboarding status
// - NO 500s
// - Backend source of truth
// - Includes live AI telemetry
// ============================================================

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

    // ----------------------------------------------------------
    // Core org state (UI + tutorial handoff)
    // ----------------------------------------------------------
    const orgRows = await sql`
      SELECT onboarding_step, dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${orgIdInt}
      LIMIT 1;
    `;

    if (!orgRows || orgRows.length === 0) {
      return res.status(200).json({
        ok: false,
        skipped: true,
      });
    }

    const org = orgRows[0];

    const onboardingStep = Number(org.onboarding_step || 0);
    const onboardingComplete = onboardingStep >= 6;

    // ----------------------------------------------------------
    // Live onboarding telemetry (AI activity feed)
    // ----------------------------------------------------------
    const stateRows = await sql`
      SELECT current_step, progress, status
      FROM org_onboarding_state
      WHERE org_id = ${orgIdInt}
      LIMIT 1;
    `;

    const state = stateRows?.[0] || {};

    return res.status(200).json({
      ok: true,

      // UI flow
      onboardingStep,
      onboardingComplete,
      dashboardTutorialEnabled:
        org.dashboard_tutorial_enabled === true,

      // 🔥 Live AI telemetry
      currentStep: state.current_step || null,
      progress: Number(state.progress) || 0,
      status: state.status || "idle",
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
