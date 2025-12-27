// lib/trialGuard.js
// ============================================================
// TRIAL GUARD — SINGLE SOURCE OF TRUTH
// ============================================================

export function getTrialStatus(org) {
  if (!org?.trial_started_at || !org?.trial_ends_at) {
    return {
      status: "unknown",
      expired: true,
      daysLeft: 0,
    };
  }

  const now = new Date();
  const trialEnd = new Date(org.trial_ends_at);
  const msLeft = trialEnd - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (msLeft <= 0) {
    return {
      status: "expired",
      expired: true,
      daysLeft: 0,
    };
  }

  if (daysLeft <= 4) {
    return {
      status: "ending",
      expired: false,
      daysLeft,
    };
  }

  return {
    status: "active",
    expired: false,
    daysLeft,
  };
}

export function canRunAutomation(org) {
  const trial = getTrialStatus(org);

  // ❌ Trial expired → NO automation
  if (trial.expired) return false;

  // ❌ Not billed yet → NO automation
  if (org.billing_status !== "active") return false;

  return true;
}
