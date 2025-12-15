// pages/api/onboarding/status.js
// UUID-safe, skip-safe onboarding status (NO 500s)

import { sql } from "../../../lib/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOrgId(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return UUID_RE.test(s) ? s : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanOrgId(req.query.orgId);

    // HARD GUARD — never 500 on bad org
    if (!orgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
      });
    }

    const rows = await sql`
      SELECT onboarding_step, dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
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

