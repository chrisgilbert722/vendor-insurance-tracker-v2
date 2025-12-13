// lib/renewalEngineV2.js
// ============================================================
// Renewal Automation Engine — V2 (full-stage automation + AI-ready)
// Emits webhook: renewal.alert
//
// NOTE:
// This is the ONLY renewal engine used by the system.
// The older `renewalEngine.js` should be removed to avoid build errors.
// ============================================================

import { sql } from "./db";
import { insertAlertV2Safe } from "./alertsV2Engine";
import { emitWebhook } from "./webhooks";

/*
Renewal ladder:
90d → Initial planning alert
30d → Broker request
7d  → Escalation
3d  → High severity reminder
1d  → Immediate renewal required
0d  → Policy expired
*/

export const RENEWAL_STAGES = [90, 30, 7, 3, 1, 0];

function today() {
  return new Date();
}

function diffDays(a, b) {
  return Math.floor((b - a) / 86400000);
}

/**
 * Compute the next stage a policy should trigger.
 */
export function computeRenewalStage(scheduleRow) {
  const exp = new Date(scheduleRow.expiration_date);
  const now = today();
  const daysLeft = diffDays(now, exp);

  if (daysLeft > 90) return null;
  if (daysLeft <= 90 && daysLeft > 30) return 90;
  if (daysLeft <= 30 && daysLeft > 7) return 30;
  if (daysLeft <= 7 && daysLeft > 3) return 7;
  if (daysLeft <= 3 && daysLeft > 1) return 3;
  if (daysLeft <= 1 && daysLeft >= 0) return 1;
  if (daysLeft < 0) return 0;

  return null;
}

/**
 * Create a human message per stage.
 */
function stageMessage(name, coverage, expDate, daysLeft, stage) {
  if (stage === 90)
    return `${coverage} for ${name} expires in ≈90 days. Begin renewal planning.`;
  if (stage === 30)
    return `${coverage} for ${name} expires in ≈30 days. Send renewal request to broker.`;
  if (stage === 7)
    return `${coverage} for ${name} expires in 7 days. Escalate with vendor OR broker.`;
  if (stage === 3)
    return `${coverage} for ${name} expires in 3 days. HIGH PRIORITY — follow up immediately.`;
  if (stage === 1)
    return `${coverage} for ${name} expires tomorrow. Immediate renewal action required.`;
  if (stage === 0)
    return `${coverage} for ${name} is now EXPIRED. Vendor out of compliance until new COI received.`;

  return `${coverage} expiring for ${name}.`;
}

/**
 * Execute the renewal logic for one schedule row.
 */
export async function runRenewalForSchedule(scheduleRow) {
  const stage = computeRenewalStage(scheduleRow);

  // If no stage triggered, check again in 24 hours
  if (!stage) {
    await sql`
      UPDATE policy_renewal_schedule
      SET next_check_at = NOW() + INTERVAL '24 hours',
          last_checked_at = NOW()
      WHERE id = ${scheduleRow.id};
    `;
    return null;
  }

  // Load vendor name
  const vendorRows = await sql`
    SELECT name
    FROM vendors
    WHERE id = ${scheduleRow.vendor_id}
    LIMIT 1;
  `;
  const vendorName = vendorRows[0]?.name || `Vendor #${scheduleRow.vendor_id}`;

  const coverage = scheduleRow.coverage_type;
  const expDate = scheduleRow.expiration_date;
  const daysLeft = diffDays(today(), new Date(expDate));

  // Compose alert message
  const message = stageMessage(vendorName, coverage, expDate, daysLeft, stage);

  // ---------------------------------------------------------
  // CREATE RENEWAL ALERT
  // ---------------------------------------------------------
  await insertAlertV2Safe({
    orgId: scheduleRow.org_id,
    vendorId: scheduleRow.vendor_id,
    type: `renew_${stage}`,
    severity: stage <= 3 ? "high" : "medium",
    category: "renewal",
    message,
    metadata: {
      scheduleId: scheduleRow.id,
      coverage,
      expDate,
      daysLeft,
      stage,
    },
  });

  // ---------------------------------------------------------
  // WEBHOOK: renewal.alert
  // ---------------------------------------------------------
  try {
    await emitWebhook(scheduleRow.org_id, "renewal.alert", {
      vendorId: scheduleRow.vendor_id,
      coverageType: coverage,
      expirationDate: expDate,
      daysLeft,
      stage,
      severity: stage <= 3 ? "high" : "medium",
      message,
      occurredAt: new Date().toISOString(),
    });
  } catch (err) {
    // Never block renewal engine if webhook fails
    console.error("[webhook renewal.alert]", err);
  }

  // Update schedule
  await sql`
    UPDATE policy_renewal_schedule
    SET last_checked_at = NOW(),
        next_check_at = NOW() + INTERVAL '24 hours',
        last_stage = ${stage}
    WHERE id = ${scheduleRow.id};
  `;

  return { stage, message };
}

/**
 * Run renewal engine for a single org.
 */
export async function runRenewalEngineForOrgV2(orgId) {
  const dueRows = await sql`
    SELECT *
    FROM policy_renewal_schedule
    WHERE org_id = ${orgId}
      AND next_check_at <= NOW()
      AND status = 'active';
  `;

  const results = [];
  for (const row of dueRows) {
    const res = await runRenewalForSchedule(row);
    if (res) results.push({ policyId: row.policy_id, ...res });
  }

  return {
    orgId,
    triggered: results.length,
    details: results,
  };
}

/**
 * Run for all orgs.
 */
export async function runRenewalEngineAllOrgsV2() {
  const orgs = await sql`SELECT DISTINCT org_id FROM policies;`;

  const output = [];
  for (const o of orgs) {
    output.push(await runRenewalEngineForOrgV2(o.org_id));
  }

  return output;
}
