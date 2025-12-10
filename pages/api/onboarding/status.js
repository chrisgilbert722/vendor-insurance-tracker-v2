// pages/api/onboarding/status.js
// Returns onboarding status, progress %, and dashboard tutorial flag

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId in query." });
    }

    // Pull ALL onboarding-related fields
    const rows = await sql`
      SELECT 
        onboarding_step,
        first_upload_at,
        dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Organization not found." });
    }

    const org = rows[0];

    // ------------------------------------------------------
    // EXTRACT FIELDS
    // ------------------------------------------------------
    const onboardingStep = org.onboarding_step ?? 0;
    const hasUpload = !!org.first_upload_at;
    const dashboardTutorialEnabled = !!org.dashboard_tutorial_enabled;

    // Wizard is considered complete if:
    // - onboarding_step >= 10 (full wizard), OR
    // - first upload exists (legacy condition)
    const onboardingComplete =
      onboardingStep >= 10 || hasUpload;

    // Progress ring logic for Sidebar
    const totalSteps = 10; // AI Wizard has 10 steps
    const progressPercent = Math.min(
      100,
      Math.round((onboardingStep / totalSteps) * 100)
    );

    return res.status(200).json({
      ok: true,
      onboardingComplete,
      onboardingStep,
      hasUpload,
      dashboardTutorialEnabled,
      progressPercent,
    });
  } catch (err) {
    console.error("[onboarding/status] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Status failed." });
  }
}
