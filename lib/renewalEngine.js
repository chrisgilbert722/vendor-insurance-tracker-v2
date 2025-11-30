// lib/renewalEngine.js — Renewal Engine V3
// WITH Auto-Email + RuleEngine + Alerts

import { sql } from "./db";
import { insertAlertV2Safe } from "./alertsV2Engine";
import {
  planAutoEmailForRenewal,
} from "./autoEmailBrain";

/* ============================================================
   TIME HELPERS
============================================================ */
function now() {
  return new Date();
}

function diffInDays(from, to) {
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

/* ============================================================
   ENSURE RENEWAL SCHEDULE
============================================================ */
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
      org_id, policy_id, vendor_id,
      expiration_date, coverage_type,
      next_check_at
    ) VALUES (
      ${policy.org_id},
      ${policy.id},
      ${policy.vendor_id},
      ${policy.expiration_date},
      ${policy.coverage_type},
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

/* ============================================================
   LOG EVENT
============================================================ */
export async function logRenewalEvent({
  orgId,
  policyId,
  vendorId,
  type,
  message,
  meta = {},
}) {
  await sql`
    INSERT INTO policy_renewal_events (
      org_id, policy_id, vendor_id,
      event_type, message, meta
    )
    VALUES (
      ${orgId},
      ${policyId},
      ${vendorId},
      ${type},
      ${message},
      ${meta}
    );
  `;
}

/* ============================================================
   GET ALL DUE RENEWALS
============================================================ */
export async function getDueRenewals(orgId) {
  const rows = await sql`
    SELECT prs.*, p.coverage_type, p.expiration_date,
           v.name AS vendor_name, v.email AS vendor_email,
           o.name AS org_name
    FROM policy_renewal_schedule prs
    JOIN policies p ON p.id = prs.policy_id
    JOIN vendors v ON v.id = prs.vendor_id
    JOIN organizations o ON o.id = prs.org_id
    WHERE prs.org_id = ${orgId}
      AND prs.status = 'active'
      AND prs.next_check_at <= NOW();
  `;
  return rows;
}

/* ============================================================
   COMPUTE ACTION STAGE
============================================================ */
export function computeRenewalActionsForPolicy(scheduleRow) {
  const exp = new Date(scheduleRow.expiration_date);
  const today = now();
  const daysLeft = diffInDays(today, exp);

  let stage = null;

  if (daysLeft > 90) stage = null;
  else if (daysLeft <= 90 && daysLeft > 30) stage = 90;
  else if (daysLeft <= 30 && daysLeft > 7) stage = 30;
  else if (daysLeft <= 7 && daysLeft > 3) stage = 7;
  else if (daysLeft <= 3 && daysLeft > 1) stage = 3;
  else if (daysLeft <= 1 && daysLeft >= 0) stage = 1;
  else if (daysLeft < 0) stage = 0;

  const actions = [];

  if (stage === 90) actions.push({ kind: "alert", severity: "medium", code: "renew_90d" });
  if (stage === 30) actions.push({ kind: "alert", severity: "high", code: "renew_30d" });
  if (stage === 7)  actions.push({ kind: "alert", severity: "high", code: "renew_7d" });
  if (stage === 3)  actions.push({ kind: "alert", severity: "high", code: "renew_3d" });
  if (stage === 1)  actions.push({ kind: "alert", severity: "critical", code: "renew_1d" });
  if (stage === 0)  actions.push({ kind: "alert", severity: "critical", code: "renew_expired" });

  return { actions, stage, daysLeft };
}

/* ============================================================
   EXECUTE RENEWAL ACTIONS (NOW WITH AUTO-EMAIL)
============================================================ */
export async function executeRenewalActionsForPolicy(scheduleRow) {
  const { actions, stage, daysLeft } = computeRenewalActionsForPolicy(scheduleRow);

  // no actionable stage? reschedule
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

  const coverage = scheduleRow.coverage_type;
  const expDate = scheduleRow.expiration_date;
  const orgName = scheduleRow.org_name;
  const vendorName = scheduleRow.vendor_name;

  const complianceRow = await sql`
    SELECT summary
    FROM vendor_compliance_cache
    WHERE vendor_id = ${scheduleRow.vendor_id}
      AND org_id = ${scheduleRow.org_id}
    LIMIT 1;
  `;

  const complianceSummary = complianceRow[0]?.summary || "No compliance context.";

  /* ------------------------------------------------------------
     🔥 STEP 1 — FIRE ALERTS
  ------------------------------------------------------------ */
  for (const action of actions) {
    if (action.kind === "alert") {
      const msg =
        action.code === "renew_expired"
          ? `${coverage} policy is now EXPIRED.`
          : `${coverage} policy renews in ${daysLeft} days.`;

      await insertAlertV2Safe({
        orgId: scheduleRow.org_id,
        vendorId: scheduleRow.vendor_id,
        type: action.code,
        severity: action.severity,
        category: "renewal",
        message: msg,
        metadata: {
          scheduleId: scheduleRow.id,
          daysLeft,
          coverage,
        },
      });

      await logRenewalEvent({
        orgId: scheduleRow.org_id,
        policyId: scheduleRow.policy_id,
        vendorId: scheduleRow.vendor_id,
        type: "alert_created",
        message: msg,
        meta: action,
      });
    }
  }

  /* ------------------------------------------------------------
     🔥 STEP 2 — AUTO-EMAIL TRIGGERS (Vendor + Broker)
  ------------------------------------------------------------ */
  const emailRes = await planAutoEmailForRenewal({
    scheduleRow,
    orgName,
    vendorName,
    coverage,
    stage,
    daysLeft,
    expDate,
    complianceSummary,
  });

  await logRenewalEvent({
    orgId: scheduleRow.org_id,
    policyId: scheduleRow.policy_id,
    vendorId: scheduleRow.vendor_id,
    type: "email_planned",
    message: `Auto-email planned (vendor=${emailRes.vendorEmailSent}, broker=${emailRes.brokerEmailSent}).`,
    meta: emailRes,
  });

  /* ------------------------------------------------------------
     🔥 STEP 3 — RESCHEDULE NEXT CHECK
  ------------------------------------------------------------ */
  await sql`
    UPDATE policy_renewal_schedule
    SET next_check_at = NOW() + INTERVAL '1 day',
        last_checked_at = NOW(),
        updated_at = NOW()
    WHERE id = ${scheduleRow.id};
  `;
}

/* ============================================================
   RUN ENGINE FOR ORG
============================================================ */
export async function runRenewalEngineForOrg(orgId) {
  const rows = await getDueRenewals(orgId);

  for (const row of rows) {
    await executeRenewalActionsForPolicy(row);
  }

  return { orgId, count: rows.length };
}

/* ============================================================
   RUN ENGINE FOR ALL ORGS
============================================================ */
export async function runRenewalEngineForAllOrgs() {
  const orgs = await sql`SELECT id FROM organizations;`;
  const out = [];

  for (const o of orgs) {
    out.push(await runRenewalEngineForOrg(o.id));
  }

  return out;
}
