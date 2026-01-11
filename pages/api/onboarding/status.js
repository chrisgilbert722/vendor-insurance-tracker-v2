// pages/api/onboarding/status.js
// ============================================================
// UUID-safe onboarding status — HARDENED
// - ALWAYS returns a step for valid orgs
// - NEVER leaves UI in loading limbo
// - Backend is single source of truth
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // 🔑 Resolve external_uuid → internal INT org id
    const orgIdInt = await resolveOrg(req, res);

    // If org truly cannot be resolved, fail-open to step 1
    if (!orgIdInt) {
      return res.status(200).json({
        ok: true,
        onboardingStep: 0,
        onboardingComplete: false,
        dashboardTutorialEnabled: false,
        currentStep: null,
        progress: 0,
        status: "idle",
      });
    }

    // ----------------------------------------------------------
    // Core org state (UI driver)
    // ----------------------------------------------------------
    const [org] = await sql`
      SELECT onboarding_step, dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${orgIdInt}
      LIMIT 1;
    `;

    // Org exists but row missing → default safely
    const onboardingStep = Number(org?.onboarding_step ?? 0);
    const onboardingComplete = onboardingStep >= 6;

    // ----------------------------------------------------------
    // Live onboarding telemetry (optional)
    // ----------------------------------------------------------
    const [state] = await sql`
      SELECT current_step, progress, status
      FROM org_onboarding_state
      WHERE org_id = ${orgIdInt}
      LIMIT 1;
    `;

    return res.status(200).json({
      ok: true,

      // UI flow (ALWAYS PRESENT)
      onboardingStep,
      onboardingComplete,
      dashboardTutorialEnabled:
        org?.dashboard_tutorial_enabled === true,

      // Telemetry (best-effort)
      currentStep: state?.current_step ?? null,
      progress: Number(state?.progress ?? 0),
      status: state?.status ?? "idle",
    });
  } catch (err) {
    // 🚨 LAST-RESORT FAIL-OPEN (NEVER brick UI)
    console.error("[onboarding/status] fail-open:", err);

    return res.status(200).json({
      ok: true,
      onboardingStep: 0,
      onboardingComplete: false,
      dashboardTutorialEnabled: false,
      currentStep: null,
      progress: 0,
      status: "idle",
    });
  }
}
