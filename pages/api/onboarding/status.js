// pages/api/onboarding/status.js
// Returns onboarding + tutorial state for an org (UUID-safe)

import { sql } from "../../../lib/db";

/* ------------------------------------------------------------
   UUID GUARD
------------------------------------------------------------ */
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
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const safeOrgId = cleanOrgId(req.query.orgId);

    // 🚫 HARD GUARD — prevent dashboard auto-load spam
    if (!safeOrgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Missing or invalid orgId",
      });
    }

    // UUID-safe lookup
    const rows = await sql`
      SELECT
        onboarding_step,
        dashboard_tutorial_enabled
      FROM organizations
      WHERE id = ${safeOrgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Organization not found",
      });
    }

    const org = rows[0];

    const onboardingStep = org.onboarding_step ?? 0;
    const dashboardTutorialEnabled =
      org.dashboard_tutorial_enabled === true;

    const onboardingComplete = onboardingStep >= 6;

    return res.status(200).json({
      ok: true,
      onboardingComplete,
      onboardingStep,
      dashboardTutorialEnabled,
    });
  } catch (err) {
    console.error("[onboarding/status] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Status failed.",
    });
  }
}
