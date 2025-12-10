// pages/api/onboarding/status.js
// Returns onboarding + tutorial state for an org

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in query."
      });
    }

    // 🟢 FIXED: only select columns that actually exist
    const rows = await sql`
      SELECT
        onboarding_step,
        dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.status(404).json({
        ok: false,
        error: "Organization not found."
      });
    }

    const org = rows[0];

    const onboardingStep = org.onboarding_step ?? 0;
    const dashboardTutorialEnabled = org.dashboard_tutorial_enabled === true;

    // You decide when onboarding is "complete"
    const onboardingComplete = onboardingStep >= 6;

    return res.status(200).json({
      ok: true,
      onboardingComplete,
      onboardingStep,
      dashboardTutorialEnabled
    });
  } catch (err) {
    console.error("[onboarding/status] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Status failed."
    });
  }
}
