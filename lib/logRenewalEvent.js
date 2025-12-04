// lib/logRenewalEvent.js
import { sql } from "./db";

export async function logRenewalEvent(vendorId, action, message, severity = "info") {
  try {
    await sql`
      INSERT INTO vendor_timeline (vendor_id, action, message, severity)
      VALUES (${vendorId}, ${action}, ${message}, ${severity});
    `;
  } catch (err) {
    console.error("[RENEWAL TIMELINE ERROR]", err);
  }
}
