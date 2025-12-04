// pages/api/onboarding/ai/calibrate-rules.js
import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { orgId, aiSample } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }
    if (!aiSample) {
      return res.status(400).json({ ok: false, error: "Missing aiSample" });
    }

    const {
      policyTypes,
      limits,
      endorsements,
      recommendedRules,
      brokerStyle,
      observations,
    } = aiSample;

    /* ==========================================================
       Build Rule Profile Object
       These are V5-ready fields.
    ========================================================== */

    const ruleProfile = {
      version: "v5-auto",
      calibratedAt: new Date().toISOString(),

      brokerStyle,
      observations,

      coverageRequired: policyTypes || [],
      limitsRequired: limits || {},

      endorsementsRequired: endorsements || [],
      requireAI: endorsements?.includes("Additional Insured") || true,
      requireWOS: endorsements?.includes("Waiver of Subrogation") || true,
      requirePNC: endorsements?.includes("Primary & Non-Contributory") || false,

      expirationWarningDays:
        recommendedRules?.expirationWarningDays ?? 30,

      missingCoverageSeverity:
        recommendedRules?.defaultMissingSeverity ?? "high",
    };

    /* ==========================================================
       Save into org_settings or fallback
    ========================================================== */

    await sql`
      UPDATE organizations
      SET rule_profile = ${ruleProfile}
      WHERE id = ${orgId};
    `;

    return res.status(200).json({
      ok: true,
      ruleProfile,
    });
  } catch (err) {
    console.error("[calibrate-rules] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
 
