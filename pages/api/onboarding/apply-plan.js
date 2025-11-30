// pages/api/onboarding/apply-plan.js
// Receives AI onboarding payload and seeds the system using onboardingApplyPlan()

import { onboardingApplyPlan } from "../../../lib/onboardingApplyPlan";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, payload } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    if (!payload) {
      return res.status(400).json({ ok: false, error: "Missing AI payload" });
    }

    // RUN THE SEEDER
    const result = await onboardingApplyPlan({ orgId, payload });

    return res.status(200).json({
      ok: true,
      summary: result.summary,
    });
  } catch (err) {
    console.error("[apply-plan] error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Unknown error applying onboarding plan",
    });
  }
}
