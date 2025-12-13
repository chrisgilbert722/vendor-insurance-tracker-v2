// lib/alertAutoActions.js
// ==========================================
// Alert Auto-Action Router (V1 — SAFE MODE)
// Deterministic, auditable, no silent actions
// ==========================================

import { sql } from "./db";

/**
 * Execute an automatic action for a single alert.
 * This runs AFTER the alert is created.
 */
export async function runAutoActionForAlert(alert) {
  if (!alert || !alert.type) return;

  switch (alert.type) {
    case "expiration_30d":
    case "expiration_90d":
      return scheduleVendorReminder(alert);

    case "expiration_expired":
      return markVendorAtRisk(alert);

    case "w9_missing":
    case "w9_missing_tin":
      return requestVendorDocument(alert, "W-9");

    case "license_missing":
    case "license_expired":
      return requestVendorDocument(alert, "License");

    case "missing_coverage":
      return requestVendorDocument(alert, "Certificate of Insurance");

    // 🔒 default = no auto action (human review)
    default:
      return;
  }
}

/* ==========================================
   ACTION IMPLEMENTATIONS
========================================= */

async function scheduleVendorReminder(alert) {
  // Safe action: mark alert as "in_review"
  await sql`
    UPDATE alerts_v2
    SET status = 'in_review'
    WHERE id = ${alert.id};
  `;
}

async function markVendorAtRisk(alert) {
  // Safe, internal-only signal
  await sql`
    UPDATE vendors
    SET risk_flag = true
    WHERE id = ${alert.vendor_id};
  `;
}

async function requestVendorDocument(alert, docType) {
  // Mark alert in review — email sending comes next phase
  await sql`
    UPDATE alerts_v2
    SET status = 'in_review',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{auto_action}',
          to_jsonb(${`requested_${docType}`}),
          true
        )
    WHERE id = ${alert.id};
  `;
}
