// pages/api/org/first-time-check.js
// ============================================================
// FIRST-TIME STATE CHECK — Single source of truth
// Returns explicit boolean for each first-time criteria
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      // No org = definitely first time
      return res.status(200).json({
        ok: true,
        isFirstTime: true,
        checks: {
          vendors: true,
          policies: true,
          certificates: true,
          rules: true,
          ruleGroups: true,
          alerts: true,
          evaluations: true,
          trialNotStarted: true,
          onboardingNotComplete: true,
        },
      });
    }

    // Run all checks in parallel for performance
    const [
      vendorResult,
      policyResult,
      certResult,
      ruleGroupResult,
      ruleResult,
      alertResult,
      orgResult,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM vendors WHERE org_id = ${orgId}`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*)::int as count FROM policies WHERE org_id = ${orgId}`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*)::int as count FROM certificates WHERE vendor_id IN (SELECT id FROM vendors WHERE org_id = ${orgId})`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*)::int as count FROM requirements_groups_v2 WHERE org_id = ${orgId}`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*)::int as count FROM requirements_rules_v2 WHERE group_id IN (SELECT id FROM requirements_groups_v2 WHERE org_id = ${orgId})`.catch(() => [{ count: 0 }]),
      sql`SELECT COUNT(*)::int as count FROM alerts_v2 WHERE org_id = ${orgId}`.catch(() => [{ count: 0 }]),
      sql`SELECT onboarding_step, trial_started_at FROM organizations WHERE id = ${orgId}`.catch(() => [{}]),
    ]);

    const vendorCount = vendorResult[0]?.count ?? 0;
    const policyCount = policyResult[0]?.count ?? 0;
    const certCount = certResult[0]?.count ?? 0;
    const ruleGroupCount = ruleGroupResult[0]?.count ?? 0;
    const ruleCount = ruleResult[0]?.count ?? 0;
    const alertCount = alertResult[0]?.count ?? 0;
    const onboardingStep = orgResult[0]?.onboarding_step ?? 0;
    const trialStartedAt = orgResult[0]?.trial_started_at ?? null;

    // First-time state check (explicit)
    const checks = {
      vendors: vendorCount === 0,
      policies: policyCount === 0,
      certificates: certCount === 0,
      rules: ruleCount === 0,
      ruleGroups: ruleGroupCount === 0,
      alerts: alertCount === 0,
      evaluations: true, // Assume true if no alerts (evaluations create alerts)
      trialNotStarted: !trialStartedAt,
      onboardingNotComplete: onboardingStep < 6,
    };

    const isFirstTime = Object.values(checks).every((v) => v === true);

    return res.status(200).json({
      ok: true,
      isFirstTime,
      checks,
      counts: {
        vendors: vendorCount,
        policies: policyCount,
        certificates: certCount,
        ruleGroups: ruleGroupCount,
        rules: ruleCount,
        alerts: alertCount,
      },
      onboardingStep,
      trialStartedAt,
    });
  } catch (err) {
    console.error("[first-time-check] error:", err);
    // Fail open - assume first time if error
    return res.status(200).json({
      ok: true,
      isFirstTime: true,
      error: err.message,
      checks: {
        vendors: true,
        policies: true,
        certificates: true,
        rules: true,
        ruleGroups: true,
        alerts: true,
        evaluations: true,
        trialNotStarted: true,
        onboardingNotComplete: true,
      },
    });
  }
}
