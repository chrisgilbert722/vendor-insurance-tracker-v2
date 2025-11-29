// lib/renewalEngine.js
// Renewal Automation Engine — Phase 1 (core logic)

import { sql } from "./db";
import { insertAlertV2Safe } from "./alertsV2Engine";

// CONFIG: thresholds in days
const THRESHOLDS = [90, 30, 7, 3, 1, 0]; // days before/at expiration

// Helper: get current timestamp
function now() {
  return new Date();
}

// Helper: days between two dates
function diffInDays(from, to) {
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Ensure a policy has a renewal schedule row.
 * Called when policies are created/updated (Phase 2 later),
 * but for now we can hydrate it in a batch job.
 */
export async function ensureRenewalScheduleForPolicy(policy) {
  if (!policy.expiration_date) return;

  const existing = await sql`
    SELECT id FROM policy_renewal_schedule
    WHERE policy_id = ${policy.id} AND org_id = ${policy.org_id}
    LIMIT 1;
  `;

  if (existing.length > 0) return existing[0].id;

  const inserted = await sql`
    INSERT INTO policy_renewal_schedule (
      org_id, policy_id, vendor_id, expiration_date, coverage_type, next_check_at
    )
    VALUES (
      ${policy.org_id}, ${policy.id}, ${policy.vendor_id},
      ${policy.expiration_date}, ${policy.coverage_type},
      NOW()
    )
    RETURNING id;
  `;

  await logRenewalEvent({
    orgId: policy.org_id,
    policyId: policy.id,
    vendorId: policy.vendor_id,
    type: "scheduled",
    message: "Initial renewal schedule created.",
    meta: { expiration_date: policy.expiration_date },
  });

  return inserted[0].id;
}

/**
 * Log a renewal-related event
 */
export async function logRenewalEvent({
  orgId,
  policyId,
  vendorId,
  type,
  message,
  meta = {},
}) {
  await sql`
    INSERT INTO policy_renewal_events (org_id, policy_id, vendor_id, event_type, message, meta)
    VALUES (${orgId}, ${policyId}, ${vendorId}, ${type}, ${message}, ${meta});
  `;
}

/**
 * Fetch policies that need renewal evaluation now.
 * We use policy_renewal_schedule.next_check_at <= NOW()
 */
export async function getDueRenewals(orgId) {
  const rows = await sql`
    SELECT prs.*, p.coverage_type, p.expiration_date, v.name AS vendor_name, v.email AS vendor_email
    FROM policy_renewal_schedule prs
    JOIN policies p ON p.id = prs.policy_id
    JOIN vendors v ON v.id = prs.vendor_id
    WHERE prs.org_id = ${orgId}
      AND prs.status = 'active'
      AND prs.next_check_at <= NOW();
  `;
  return rows;
}

/**
 * Decide what actions to take for a single policy: which reminder stage.
 * Returns array of actions like:
 *  { kind: 'send_email', stage: '90', ...}
 *  { kind: 'create_alert', severity: 'medium', ...}
 */
export function computeRenewalActionsForPolicy(scheduleRow) {
  const expDate = new Date(scheduleRow.expiration_date);
  const today = now();
  const daysLeft = diffInDays(today, expDate);

  const actions = [];

  // Determine stage
  let stage = null;
  if (daysLeft > 90) {
    // Too early; schedule next check around 90 days prior
    stage = null;
  } else if (daysLeft <= 90 && daysLeft > 30) {
    stage = 90;
  } else if (daysLeft <= 30 && daysLeft > 7) {
    stage = 30;
  } else if (daysLeft <= 7 && daysLeft > 3) {
    stage = 7;
  } else if (daysLeft <= 3 && daysLeft > 1) {
    stage = 3;
  } else if (daysLeft <= 1 && daysLeft >= 0) {
    stage = 1;
  } else if (daysLeft < 0) {
    stage = 0;
  }

  if (stage === null) {
    // too early or no expiration; no actions, just schedule next check
    return { actions, daysLeft, stage: null };
  }

  // Add actions based on stage
  // (Phase 1: we create alerts; Phase 2: we add email sends, etc.)
  if (stage === 90) {
    actions.push({ kind: "alert", severity: "medium", code: "renew_90d" });
  } else if (stage === 30) {
    actions.push({ kind: "alert", severity: "high", code: "renew_30d" });
  } else if (stage === 7) {
    actions.push({ kind: "alert", severity: "high", code: "renew_7d" });
  } else if (stage === 3) {
    actions.push({ kind: "alert", severity: "high", code: "renew_3d" });
  } else if (stage === 1) {
    actions.push({ kind: "alert", severity: "critical", code: "renew_1d" });
  } else if (stage === 0) {
    actions.push({ kind: "alert", severity: "critical", code: "renew_expired" });
  }

  return { actions, daysLeft, stage };
}

/**
 * Execute actions for one scheduled policy row.
 */
export async function executeRenewalActionsForPolicy(scheduleRow) {
  const { actions, daysLeft, stage } = computeRenewalActionsForPolicy(scheduleRow);

  // No actions? just reschedule next check a day later
  if (!actions.length) {
    await sql`
      UPDATE policy_renewal_schedule
      SET next_check_at = NOW() + INTERVAL '1 day',
          last_checked_at = NOW(),
          updated_at = NOW()
      WHERE id = ${scheduleRow.id};
    `;
    return;
  }

  // For each action, perform something
  for (const action of actions) {
    if (action.kind === "alert") {
      const message = buildRenewalAlertMessage(scheduleRow, daysLeft, action.code);
      await insertAlertV2Safe({
        orgId: scheduleRow.org_id,
        vendorId: scheduleRow.vendor_id,
        type: action.code,
        severity: action.severity,
        category: "renewal",
        message,
        ruleId: null,
        metadata: {
          scheduleId: scheduleRow.id,
          daysLeft,
          expiration_date: scheduleRow.expiration_date,
          coverage_type: scheduleRow.coverage_type,
        },
      });

      await logRenewalEvent({
        orgId: scheduleRow.org_id,
        policyId: scheduleRow.policy_id,
        vendorId: scheduleRow.vendor_id,
        type: "alert_created",
        message,
        meta: { action, daysLeft },
      });
    }

    // Phase 2: add 'send_email' / 'notify_internal' etc.
  }

  // Reschedule next check: once per day
  await sql`
    UPDATE policy_renewal_schedule
    SET next_check_at = NOW() + INTERVAL '1 day',
        last_checked_at = NOW(),
        updated_at = NOW()
    WHERE id = ${scheduleRow.id};
  `;
}

/**
 * Build human-readable alert message for the stage.
 */
function buildRenewalAlertMessage(scheduleRow, daysLeft, code) {
  const base = scheduleRow.coverage_type || "Policy";
  const vendor = scheduleRow.vendor_name || `Vendor #${scheduleRow.vendor_id}`;
  const exp = scheduleRow.expiration_date;

  if (code === "renew_90d") {
    return `${base} for ${vendor} expires in ~${daysLeft} days (≈90 days out). Start renewal planning.`;
  }
  if (code === "renew_30d") {
    return `${base} for ${vendor} expires in ~${daysLeft} days (30-day window). Send renewal request.`;
  }
  if (code === "renew_7d") {
    return `${base} for ${vendor} expires in ${daysLeft} days (7-day critical window). Follow up with vendor/broker.`;
  }
  if (code === "renew_3d") {
    return `${base} for ${vendor} expires in ${daysLeft} days. High-priority renewal reminder.`;
  }
  if (code === "renew_1d") {
    return `${base} for ${vendor} expires tomorrow. Immediate renewal action required.`;
  }
  if (code === "renew_expired") {
    return `${base} for ${vendor} is now EXPIRED (expired on ${exp}). Vendor is out of compliance until new COI is received.`;
  }

  return `${base} for ${vendor} is approaching expiration (≈${daysLeft} days remaining).`;
}

/**
 * Run renewal engine for a single org.
 */
export async function runRenewalEngineForOrg(orgId) {
  const due = await getDueRenewals(orgId);

  if (!due.length) return { orgId, count: 0 };

  for (const row of due) {
    await executeRenewalActionsForPolicy(row);
  }

  return { orgId, count: due.length };
}

/**
 * Run renewal engine for ALL orgs.
 */
export async function runRenewalEngineForAllOrgs() {
  const orgs = await sql`
    SELECT DISTINCT org_id FROM policies;
  `;

  const results = [];
  for (const o of orgs) {
    const res = await runRenewalEngineForOrg(o.org_id);
    results.push(res);
  }

  return results;
}
