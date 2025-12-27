// lib/trialGuard.js
// ============================================================
// TRIAL GUARD
// - Blocks ACTION APIs during trial
// - Allows read-only access
// - Centralized enforcement logic
// ============================================================

import { sql } from "./db";

/**
 * Enforce trial rules for an org.
 * Throws an error if action is not allowed.
 */
export async function enforceTrialGuard({
  orgId,
  actionName = "unknown_action",
}) {
  if (!orgId) {
    throw new Error("Missing orgId for trial enforcement");
  }

  const rows = await sql`
    SELECT metadata
    FROM org_onboarding_state
    WHERE org_id = ${orgId}
    LIMIT 1;
  `;

  if (!rows.length) {
    // No onboarding state = fail closed
    throw new Error("Organization onboarding state not found");
  }

  const metadata = rows[0].metadata || {};

  const {
    trial_started_at,
    trial_ends_at,
    automation_locked,
    billing_status,
  } = metadata;

  // If billing is active, allow everything
  if (billing_status === "active") {
    return { allowed: true };
  }

  // If automation is locked, block actions
  if (automation_locked) {
    const now = new Date();
    const trialEnd = trial_ends_at ? new Date(trial_ends_at) : null;

    // Trial expired but not billed yet
    if (trialEnd && now > trialEnd) {
      throw new Error(
        "Trial expired. Please add billing to continue."
      );
    }

    throw new Error(
      `Action "${actionName}" is disabled during trial`
    );
  }

  return { allowed: true };
}
