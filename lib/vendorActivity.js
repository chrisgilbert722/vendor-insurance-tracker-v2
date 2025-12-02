// lib/vendorActivity.js
// FULL ACTIVITY ENGINE — D1 Upgrade
// --------------------------------------------------

import { sql } from "./db";

/* ============================================================
   1) Log an event
   ------------------------------------------------------------
   action    = short code (e.g. "upload", "fix", "rule_match")
   message   = human readable details
   severity  = info | warning | critical
============================================================ */
export async function logVendorActivity(
  vendorId,
  action,
  message,
  severity = "info"
) {
  try {
    await sql`
      INSERT INTO vendor_activity_log (
        vendor_id, action, message, severity, created_at
      )
      VALUES (
        ${vendorId},
        ${action},
        ${message},
        ${severity},
        NOW()
      );
    `;
  } catch (err) {
    console.error("[vendorActivity] Failed to log:", err);
  }
}

/* ============================================================
   2) Icon map
============================================================ */
export const ACTION_ICONS = {
  upload: "📄",
  parse: "🤖",
  fix: "🛠",
  resolve: "✔️",
  requirement_miss: "⚠️",
  requirement_pass: "🛡",
  limit_low: "📉",
  limit_ok: "📈",
  login: "🔐",
  portal_open: "🌐",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

/* ============================================================
   3) Transform raw DB rows → UI-friendly events
============================================================ */
export function normalizeActivityRow(row) {
  const icon =
    ACTION_ICONS[row.action] ||
    ACTION_ICONS[row.severity] ||
    "•";

  return {
    id: row.id,
    vendorId: row.vendor_id,
    action: row.action,
    message: row.message,
    severity: row.severity || "info",
    icon,
    createdAt: row.created_at,
    prettyTime: new Date(row.created_at).toLocaleString(),
  };
}

/* ============================================================
   4) Load vendor activity timeline
============================================================ */
export async function getVendorActivityTimeline(vendorId, limit = 50) {
  try {
    const rows = await sql`
      SELECT
        id, vendor_id, action, message, severity, created_at
      FROM vendor_activity_log
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;

    return rows.map((r) => normalizeActivityRow(r));
  } catch (err) {
    console.error("[vendorActivity] Timeline failed:", err);
    return [];
  }
}
