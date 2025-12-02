// lib/vendorActivity.js
import { sql } from "./db";

export async function logVendorActivity(vendorId, action, message, severity = "info") {
  try {
    await sql`
      INSERT INTO vendor_activity_log (vendor_id, action, message, severity)
      VALUES (${vendorId}, ${action}, ${message}, ${severity});
    `;
  } catch (err) {
    console.error("[vendorActivity] Failed:", err);
  }
}
