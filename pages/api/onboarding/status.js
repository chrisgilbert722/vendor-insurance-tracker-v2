// pages/api/onboarding/status.js
// ============================================================
// UUID-safe onboarding status — FINAL FIX
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    /* ----------------------------------------------------------
       1) RESOLVE ORG (QUERY → FALLBACK)
    ---------------------------------------------------------- */
    let orgIdInt = null;

    const orgUuid =
      req.query?.orgId ||
      req.body?.orgId ||
      req.headers["x-org-id"] ||
      null;

    // 🔑 PRIMARY PATH — observer sends orgId via query
    if (orgUuid) {
      const rows = await sql`
        SELECT id
        FROM organizations
        WHERE external_uuid = ${orgUuid}
        LIMIT 1;
      `;
      orgIdInt = rows?.[0]?.id ?? null;
    }

    // 🔁 FALLBACK — legacy callers
    if (!orgIdInt) {
      orgIdInt = await resolveOrg(req, res);
    }

    // 🚨 FAIL-OPEN: org not resolvable
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

    /* ----------------------------------------------------------
       2) CORE ORG STATE (UI DRIVER)
    ---------------------------------------------------------- */
    const [org] = await sql`
      SELECT onboarding_step, dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${orgIdInt}
      LIMIT 1;
    `;

    const onboardingStep = Number(org?.onboarding_step ?? 0);
    const onboardingComplete = onboardingStep >= 6;

    /* ----------------------------------------------------------
       3) LIVE TELEMETRY (BEST EFFORT)
    ---------------------------------------------------------- */
    const [state] = await sql`
      SELECT current_step, progress, status
      FROM org_onboarding_state
      WHERE org_id = ${orgIdInt}
      LIMIT 1;
    `;

    /* ----------------------------------------------------------
       4) RESPONSE (ALWAYS COMPLETE)
    ---------------------------------------------------------- */
    return res.status(200).json({
      ok: true,

      // UI flow
      onboardingStep,
      onboardingComplete,
      dashboardTutorialEnabled:
        org?.dashboard_tutorial_enabled === true,

      // Telemetry
      currentStep: state?.current_step ?? null,
      progress: Number(state?.progress ?? 0),
      status: state?.status ?? "idle",
    });
  } catch (err) {
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
