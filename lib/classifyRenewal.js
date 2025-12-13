// lib/classifyRenewal.js
// ============================================================
// Renewal Classification — Canonical, Pure, Side-Effect Free
// Used by renewal engines, dashboards, and webhook triggers
// ============================================================

/**
 * Classify a document renewal state from an expiration date.
 *
 * IMPORTANT:
 * - This function is PURE (no DB writes, no webhooks)
 * - Callers are responsible for detecting status transitions
 */
export function classifyRenewal(expirationDate) {
  if (!expirationDate) {
    return {
      status: "missing",
      daysLeft: null,
    };
  }

  const now = new Date();
  const exp = new Date(expirationDate);

  if (Number.isNaN(exp.getTime())) {
    return {
      status: "invalid",
      daysLeft: null,
    };
  }

  const daysLeft = Math.floor((exp - now) / 86400000);

  // -----------------------------
  // Canonical status ladder
  // -----------------------------
  if (daysLeft < 0) {
    return {
      status: "expired",
      daysLeft,
    };
  }

  if (daysLeft <= 7) {
    return {
      status: "critical",
      daysLeft,
    };
  }

  if (daysLeft <= 30) {
    return {
      status: "expiring",
      daysLeft,
    };
  }

  return {
    status: "valid",
    daysLeft,
  };
}
