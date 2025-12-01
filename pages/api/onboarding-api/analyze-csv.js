// pages/api/onboarding/analyze-csv.js
// API entrypoint for AI Onboarding Wizard CSV analysis

import { analyzeVendorCsv } from "../../../lib/onboardingAiBrain";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, csvText } = req.body;

    if (!csvText) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing csvText in body" });
    }

    // orgId is optional for now (we'll use it in DB seeding later)
    const result = await analyzeVendorCsv({ orgId: orgId || null, csvText });

    return res.status(200).json(result);
  } catch (err) {
    console.error("[onboarding/analyze-csv] error", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Unknown error",
    });
  }
}
