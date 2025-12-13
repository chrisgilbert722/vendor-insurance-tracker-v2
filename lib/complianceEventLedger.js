// lib/complianceEventLedger.js
import { sql } from "./db";

export async function recordComplianceEvent({
  orgId,
  vendorId = null,
  alertId = null,
  eventType,
  source = "system",
  payload = {},
}) {
  await sql`
    INSERT INTO compliance_events (
      org_id, vendor_id, alert_id,
      event_type, source, payload
    ) VALUES (
      ${orgId}, ${vendorId}, ${alertId},
      ${eventType}, ${source}, ${payload}
    );
  `;
}
