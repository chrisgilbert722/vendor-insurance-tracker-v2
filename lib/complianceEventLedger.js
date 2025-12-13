// lib/complianceEventLedger.js
import { sql } from "./db";

/**
 * Append-only compliance evidence.
 * NEVER update or delete rows from this table.
 */
export async function recordComplianceEvent({
  orgId,
  vendorId = null,
  alertId = null,
  eventType,
  source = "system",
  payload = {},
}) {
  if (!orgId || !eventType) return;

  await sql`
    INSERT INTO compliance_events (
      org_id,
      vendor_id,
      alert_id,
      event_type,
      source,
      payload
    )
    VALUES (
      ${orgId},
      ${vendorId},
      ${alertId},
      ${eventType},
      ${source},
      ${payload}
    );
  `;
}
