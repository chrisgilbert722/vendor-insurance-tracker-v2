// lib/autoEmailBrain.js
// Auto-Email Brain (Phase 3) — LIVE RESEND INTEGRATION

import OpenAI from "openai";
import { sql } from "./db";
import { sendEmail } from "./sendEmail";

/* ============================================================
   OPENAI INIT
============================================================ */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ============================================================
   STAGE → LABEL / URGENCY
============================================================ */
function describeStage(stage) {
  switch (stage) {
    case 0: return { label: "Expired", urgency: "max" };
    case 1: return { label: "1 Day Left", urgency: "very_high" };
    case 3: return { label: "3 Days Left", urgency: "high" };
    case 7: return { label: "7-Day Window", urgency: "medium_high" };
    case 30: return { label: "30-Day Window", urgency: "medium" };
    case 90: return { label: "90-Day Window", urgency: "low" };
    default: return { label: "Upcoming", urgency: "low" };
  }
}

/* ============================================================
   AI EMAIL PROMPT
============================================================ */
function buildEmailPrompt({
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  target,
  complianceSummary,
}) {
  const { label, urgency } = describeStage(stage);

  return `
Write a renewal reminder email.

Context:
- Org: ${orgName}
- Vendor: ${vendorName}
- Coverage: ${coverage}
- Stage: ${label} (${stage})
- Days Left: ${daysLeft}
- Expiration: ${expDate}
- Recipient: ${target}
- Compliance Summary: ${complianceSummary}
- Urgency: ${urgency}

Rules:
- Return JSON ONLY.
- Subject + body.
- Body = 4–7 sentences.
- Clear request for updated COI.
- No placeholders like [Name].

JSON format:
{
  "subject": "...",
  "body": "..."
}
`;
}

/* ============================================================
   AI EMAIL GENERATOR
============================================================ */
export async function generateRenewalEmail(params) {
  const prompt = buildEmailPrompt(params);

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25,
  });

  const text = res.choices[0].message.content || "";

  try {
    return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return {
      subject: `Renewal request — ${params.coverage}`,
      body: text,
    };
  }
}

/* ============================================================
   LOOKUP — Vendor Email + Broker Email
============================================================ */
export async function lookupRecipientEmails({ vendorId, policyId }) {
  const vendorRows = await sql`
    SELECT email FROM vendors WHERE id = ${vendorId} LIMIT 1;
  `;

  const policyRows = await sql`
    SELECT broker_email FROM policies WHERE id = ${policyId} LIMIT 1;
  `;

  return {
    vendorEmail: vendorRows[0]?.email || null,
    brokerEmail: policyRows[0]?.broker_email || null,
  };
}

/* ============================================================
   QUEUE EMAIL
============================================================ */
export async function enqueueRenewalEmail({
  orgId,
  vendorId,
  policyId,
  stage,
  target,
  toEmail,
  subject,
  body,
  meta = {},
}) {
  await sql`
    INSERT INTO renewal_email_queue (
      org_id, vendor_id, policy_id,
      stage, target, to_email,
      subject, body,
      status, attempts,
      created_at, meta
    ) VALUES (
      ${orgId}, ${vendorId}, ${policyId},
      ${stage}, ${target}, ${toEmail},
      ${subject}, ${body},
      'pending', 0,
      NOW(), ${meta}
    );
  `;
}

/* ============================================================
   PROCESS QUEUE — Send Emails LIVE
============================================================ */
export async function processRenewalEmailQueue(limit = 25) {
  const rows = await sql`
    SELECT * FROM renewal_email_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${limit};
  `;

  const results = [];

  for (const row of rows) {
    const sendRes = await sendEmail({
      to: row.to_email,
      subject: row.subject,
      body: row.body,
    });

    if (sendRes.ok) {
      await sql`
        UPDATE renewal_email_queue
        SET status = 'sent',
            attempts = attempts + 1,
            last_attempt_at = NOW()
        WHERE id = ${row.id};
      `;
      results.push({ id: row.id, status: "sent" });
    } else {
      await sql`
        UPDATE renewal_email_queue
        SET status = 'failed',
            attempts = attempts + 1,
            last_attempt_at = NOW()
        WHERE id = ${row.id};
      `;
      results.push({ id: row.id, status: "failed" });
    }
  }

  return results;
}

/* ============================================================
   **FIXED** — PLAN AUTO EMAIL FOR RENEWAL
============================================================ */
export async function planAutoEmailForRenewal({
  scheduleRow,
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  complianceSummary = "",
}) {
  const { vendorEmail, brokerEmail } = await lookupRecipientEmails({
    vendorId: scheduleRow.vendor_id,
    policyId: scheduleRow.policy_id,
  });

  const aiEmail = await generateRenewalEmail({
    orgName,
    vendorName,
    coverage,
    stage,
    daysLeft,
    expDate,
    target: "vendor",
    complianceSummary,
  });

  let vendorEmailSent = false;
  let brokerEmailSent = false;

  if (vendorEmail) {
    await enqueueRenewalEmail({
      orgId: scheduleRow.org_id,
      vendorId: scheduleRow.vendor_id,
      policyId: scheduleRow.policy_id,
      stage,
      target: "vendor",
      toEmail: vendorEmail,
      subject: aiEmail.subject,
      body: aiEmail.body,
    });
    vendorEmailSent = true;
  }

  if (brokerEmail) {
    await enqueueRenewalEmail({
      orgId: scheduleRow.org_id,
      vendorId: scheduleRow.vendor_id,
      policyId: scheduleRow.policy_id,
      stage,
      target: "broker",
      toEmail: brokerEmail,
      subject: aiEmail.subject,
      body: aiEmail.body,
    });
    brokerEmailSent = true;
  }

  return { vendorEmailSent, brokerEmailSent };
}

/* ============================================================
   AUTO EMAIL BRAIN — Required by cron
============================================================ */
export async function autoEmailBrain() {
  const rows = await sql`
    SELECT
      s.*,
      v.name AS vendor_name,
      o.name AS org_name
    FROM policy_renewal_schedule s
    JOIN vendors v ON v.id = s.vendor_id
    JOIN orgs o ON o.id = s.org_id
    WHERE s.next_check_at <= NOW()
      AND s.status = 'active'
  `;

  let count = 0;

  for (const row of rows) {
    const daysLeft = Math.floor(
      (new Date(row.expiration_date) - new Date()) / 86400000
    );

    await planAutoEmailForRenewal({
      scheduleRow: row,
      orgName: row.org_name,
      vendorName: row.vendor_name,
      coverage: row.coverage_type,
      stage: row.last_stage,
      daysLeft,
      expDate: row.expiration_date,
      complianceSummary: "",
    });

    count++;
  }

  return { count };
}
