// lib/renewalEngine.js
// Renewal Automation Engine — Phase 2 (emails + escalation)

import { sql } from "./db";
import { insertAlertV2Safe } from "./alertsV2Engine";
import { sendEmail } from "./email";

// CONFIG STAGES IN DAYS
const THRESHOLDS = [90, 30, 7, 3, 1, 0];

// Helper: get current timestamp
function now() {
  return new Date();
}

// Helper: days between two dates
function diffInDays(from, to) {
  return Math.floor((to - from) / (1000 * 60 * 60 * 24));
}

/* ============================================================
   INITIALIZE / HYDRATE SCHEDULE
============================================================ */
export async function ensureRenewalScheduleForPolicy(policy) {
  if (!policy.expiration_date) return;

  const existing = await sql`
    SELECT id
    FROM policy_renewal_schedule
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

/* ============================================================
   EVENTS LOG
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
    INSERT INTO policy_renewal_events
    (org_id, policy_id, vendor_id, event_type, message, meta)
    VALUES (${orgId}, ${policyId}, ${vendorId}, ${type}, ${message}, ${meta});
  `;
}

/* ============================================================
   FETCH DUE RENEWALS
============================================================ */
export async function getDueRenewals(orgId) {
  const rows = await sql`
    SELECT prs.*, p.coverage_type, p.expiration_date,
           v.name AS vendor_name, v.email AS vendor_email
    FROM policy_renewal_schedule prs
    JOIN policies p ON p.id = prs.policy_id
    JOIN vendors v ON v.id = prs.vendor_id
    WHERE prs.org_id = ${orgId}
      AND prs.status = 'active'
      AND prs.next_check_at <= NOW();
  `;
  return rows;
}

/* ============================================================
   TEMPLATE / RECIPIENT HELPERS
============================================================ */
async function getPolicyRecipients(orgId, policyId, vendorId, target) {
  const rows = await sql`
    SELECT email
    FROM policy_renewal_recipients
    WHERE org_id = ${orgId}
      AND policy_id = ${policyId}
      AND recipient_type = ${target};
  `;

  const emails = rows.map((r) => r.email).filter(Boolean);

  // Fallback to vendor email if target=vendor
  if (target === "vendor" && emails.length === 0) {
    const vendorRows = await sql`
      SELECT email FROM vendors WHERE id = ${vendorId} LIMIT 1;
    `;
    if (vendorRows.length && vendorRows[0].email) {
      emails.push(vendorRows[0].email);
    }
  }

  return emails;
}

async function getTemplateForStage(orgId, stage, target) {
  const rows = await sql`
    SELECT subject_template, body_template
    FROM policy_renewal_templates
    WHERE org_id = ${orgId}
      AND stage = ${stage}
      AND target = ${target}
      AND is_active = TRUE
    LIMIT 1;
  `;

  if (!rows.length) return null;
  return rows[0];
}

function renderTemplate(str, context) {
  if (!str) return "";
  return str.replace(/{{(\w+)}}/g, (_, key) =>
    context[key] !== undefined ? String(context[key]) : ""
  );
}

async function buildRenewalEmailContent(scheduleRow, daysLeft, stage, target) {
  const { org_id, vendor_id, policy_id, coverage_type, expiration_date, vendor_name } =
    scheduleRow;

  const tpl = await getTemplateForStage(org_id, stage, target);
  if (!tpl) return null;

  const context = {
    vendor_name: vendor_name || `Vendor #${vendor_id}`,
    coverage_type: coverage_type || "Policy",
    expiration_date,
    days_left: daysLeft,
    stage,
  };

  return {
    subject: renderTemplate(tpl.subject_template, context),
    body: renderTemplate(tpl.body_template, context),
  };
}

/* ============================================================
   ACTION DECISION LOGIC
============================================================ */
export function computeRenewalActionsForPolicy(scheduleRow) {
  const expDate = new Date(scheduleRow.expiration_date);
  const today = now();
  const daysLeft = diffInDays(today, expDate);

  let stage = null;
  if (daysLeft > 90) stage = null;
  else if (daysLeft <= 90 && daysLeft > 30) stage = 90;
  else if (daysLeft <= 30 && daysLeft > 7) stage = 30;
  else if (daysLeft <= 7 && daysLeft > 3) stage = 7;
  else if (daysLeft <= 3 && daysLeft > 1) stage = 3;
  else if (daysLeft <= 1 && daysLeft >= 0) stage = 1;
  else if (daysLeft < 0) stage = 0;

  const actions = [];
  if (stage === null) return { actions, daysLeft, stage: null };

  // Severity
  const severity =
    stage === 90
      ? "medium"
      : stage === 30
      ? "high"
      : stage === 7
      ? "high"
      : stage === 3
      ? "high"
      : stage === 1
      ? "critical"
      : "critical";

  // ALERT
  actions.push({
    kind: "alert",
    severity,
    code:
      stage === 90
        ? "renew_90d"
        : stage === 30
        ? "renew_30d"
        : stage === 7
        ? "renew_7d"
        : stage === 3
        ? "renew_3d"
        : stage === 1
        ? "renew_1d"
        : "renew_expired",
  });

  // EMAILS
  // Vendor always gets notified from 90d inward
  if (stage >= 1 || stage === 90 || stage === 30) {
    actions.push({ kind: "email", target: "vendor", stage });
  }

  // Broker from 30d inward
  if (stage <= 30) {
    actions.push({ kind: "email", target: "broker", stage });
  }

  // Internal from 7d inward
  if (stage <= 7) {
    actions.push({ kind: "email", target: "internal", stage });
  }

  return { actions, daysLeft, stage };
}

/* ============================================================
   EXECUTE ACTIONS
============================================================ */
export async function executeRenewalActionsForPolicy(scheduleRow) {
  const { actions, daysLeft, stage } = computeRenewalActionsForPolicy(scheduleRow);

  // No actions → schedule next day
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

  for (const action of actions) {
    /* -----------------------------
       ALERT CREATION
    ----------------------------- */
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
        meta: { action, daysLeft, stage },
      });
    }

    /* -----------------------------
       EMAIL SEND LOGIC
    ----------------------------- */
    if (action.kind === "email") {
      const { target, stage } = action;

      const recipients = await getPolicyRecipients(
        scheduleRow.org_id,
        scheduleRow.policy_id,
        scheduleRow.vendor_id,
        target
      );

      if (!recipients.length) {
        await logRenewalEvent({
          orgId: scheduleRow.org_id,
          policyId: scheduleRow.policy_id,
          vendorId: scheduleRow.vendor_id,
          type: "skipped",
          message: `No ${target} recipients found for stage ${stage}.`,
        });
        continue;
      }

      const content = await buildRenewalEmailContent(
        scheduleRow,
        daysLeft,
        stage,
        target
      );

      if (!content) {
        await logRenewalEvent({
          orgId: scheduleRow.org_id,
          policyId: scheduleRow.policy_id,
          vendorId: scheduleRow.vendor_id,
          type: "skipped",
          message: `No active template for stage ${stage} (${target}).`,
        });
        continue;
      }

      for (const to of recipients) {
        await sendEmail({
          to,
          subject: content.subject,
          html: content.body,
          text: content.body,
        });

        await logRenewalEvent({
          orgId: scheduleRow.org_id,
          policyId: scheduleRow.policy_id,
          vendorId: scheduleRow.vendor_id,
          type: "email_sent",
          message: `Email sent to ${target} (${to}) for stage ${stage}.`,
          meta: { stage, target, to, daysLeft },
        });
      }
    }
  }

  // Reschedule next check
  await sql`
    UPDATE policy_renewal_schedule
    SET next_check_at = NOW() + INTERVAL '1 day',
        last_checked_at = NOW(),
        updated_at = NOW()
    WHERE id = ${scheduleRow.id};
  `;
}

/* ============================================================
   ALERT MESSAGE BUILDER
============================================================ */
function buildRenewalAlertMessage(scheduleRow, daysLeft, code) {
  const base = scheduleRow.coverage_type || "Policy";
  const vendor = scheduleRow.vendor_name || `Vendor #${scheduleRow.vendor_id}`;
  const exp = scheduleRow.expiration_date;

  if (code === "renew_90d")
    return `${base} for ${vendor} expires in ~${daysLeft} days (≈90 days out). Start renewal planning.`;

  if (code === "renew_30d")
    return `${base} for ${vendor} expires in ~${daysLeft} days (30-day window). Send renewal request.`;

  if (code === "renew_7d")
    return `${base} for ${vendor} expires in ${daysLeft} days (7-day critical window). Follow up with broker.`;

  if (code === "renew_3d")
    return `${base} for ${vendor} expires in ${daysLeft} days (3 days). HIGH-PRIORITY renewal required.`;

  if (code === "renew_1d")
    return `${base} for ${vendor} expires tomorrow. Immediate renewal required.`;

  if (code === "renew_expired")
    return `${base} for ${vendor} is now EXPIRED (expired on ${exp}). Vendor is out of compliance.`;

  return `${base} for ${vendor} is approaching expiration (${daysLeft} days remaining).`;
}

/* ============================================================
   RUNNERS
============================================================ */
export async function runRenewalEngineForOrg(orgId) {
  const due = await getDueRenewals(orgId);
  if (!due.length) return { orgId, count: 0 };

  for (const row of due) {
    await executeRenewalActionsForPolicy(row);
  }

  return { orgId, count: due.length };
}

export async function runRenewalEngineForAllOrgs() {
  const orgs = await sql`
    SELECT DISTINCT org_id
    FROM policies;
  `;

  const results = [];
  for (const o of orgs) {
    const res = await runRenewalEngineForOrg(o.org_id);
    results.push(res);
  }

  return results;
}
