// lib/timeline.js
// Centralized compliance event logging for audit trail
// Events are stored in vendor_timeline table and displayed on dashboard

import { sql } from "./db";

/**
 * Log a compliance event to the vendor timeline
 * @param {Object} params
 * @param {number} params.vendorId - Required vendor ID
 * @param {string} params.action - Event type (e.g., 'coi_requested', 'coi_uploaded')
 * @param {string} params.message - Human-readable description
 * @param {string} [params.severity='info'] - Event severity: 'info', 'warning', 'high', 'critical'
 */
export async function logTimelineEvent({ vendorId, action, message, severity = "info" }) {
  if (!vendorId || !action) {
    console.warn("[timeline] Missing vendorId or action, skipping log");
    return;
  }

  try {
    await sql`
      INSERT INTO vendor_timeline (vendor_id, action, message, severity)
      VALUES (${vendorId}, ${action}, ${message}, ${severity});
    `;
  } catch (err) {
    // Never throw — timeline logging should not break main flows
    console.error("[timeline] Failed to log event:", err);
  }
}

// Predefined event types for consistency
export const TIMELINE_EVENTS = {
  // COI lifecycle
  COI_REQUESTED: "coi_requested",
  COI_UPLOADED: "coi_uploaded",
  COI_APPROVED: "coi_approved",
  COI_REJECTED: "coi_rejected",
  COI_EXPIRED: "coi_expired",

  // Alerts
  ALERT_CREATED: "alert_created",
  ALERT_RESOLVED: "alert_resolved",

  // Communications
  REMINDER_SENT: "reminder_sent",
  EMAIL_SENT: "email_sent",

  // Portal
  PORTAL_ACCESSED: "portal_accessed",
  DOCUMENT_UPLOADED: "document_uploaded",
};
