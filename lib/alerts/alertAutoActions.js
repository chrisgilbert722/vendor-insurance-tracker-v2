// lib/alerts/alertAutoActions.js
// ==================================================
// Alert Auto-Actions Engine (V1 — Safe Autonomy)
// Deterministic, reversible, auditable
// ==================================================

import { sql } from "../db";

/**
 * Run automatic follow-up actions for a newly created alert.
 * This function MUST be safe to run multiple times.
 */
export async function runAutoActionForAlert(alert) {
  if (!alert || !alert.type) return;

  switch (alert.type) {
    // -------------------------
    // EXPIRATION WARNINGS
    // -------------------------
    case "expiration_90d":
    case "expiration_30d":
      return markInReview(alert, "scheduled_reminder");

    case "expiration_expired":
      return markVendorHighRisk(alert);

    // -------------------------
    // MISSING DOCUMENTS
    // -------------------------
    case "w9_missing":
    case "w9_missing_tin":
      return requestDocument(alert, "W-9");

    case "license_missing":
    case "license_expired":
      return requestDocument(alert, "License");

    case "entity_certificate_missing":
      return requestDocument(alert, "Entity Certificate");

    // -------------------------
    // COVERAGE / RULE FAILURES
    // -------------------------
    case "missing_coverage":
    case "rule_fail":
      return markInReview(alert, "needs_fix");

    // -------------------------
    // DEFAULT — HUMAN REVIEW
    // -------------------------
    default:
      return;
  }
}

/* ==================================================
   ACTION HELPERS
================================================== */

async function markInReview(alert, reason) {
  await sql`
    UPDATE alerts_v2
    SET status = 'in_review',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{auto_action}',
          jsonb_build_object(
            'action', 'mark_in_review',
            'reason', ${reason},
            'at', NOW()
          ),
          true
        )
    WHERE id = ${alert.id};
  `;
}

async function markVendorHighRisk(alert) {
  await sql`
    UPDATE vendors
    SET risk_flag = true
    WHERE id = ${alert.vendor_id};
  `;

  await markInReview(alert, "vendor_marked_high_risk");
}

async function requestDocument(alert, docType) {
  await sql`
    UPDATE alerts_v2
    SET status = 'in_review',
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{auto_action}',
          jsonb_build_object(
            'action', 'request_document',
            'document', ${docType},
            'at', NOW()
          ),
          true
        )
    WHERE id = ${alert.id};
  `;
}
