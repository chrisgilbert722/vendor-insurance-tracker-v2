// lib/autoEmailBrain.js
// Auto-Email Brain (Phase 3) — Now with automatic vendor + broker email routing.

import OpenAI from "openai";
import { sql } from "./db";
import { Resend } from "resend";

// -------------------------
// CLIENTS
// -------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "compliance@yourdomain.com";
const REPLY_TO = process.env.REPLY_TO || "support@yourdomain.com";

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
   BUILD EMAIL PROMPT
============================================================ */
function buildEmailPrompt({ orgName, vendorName, coverage, stage, daysLeft, expDate, target, complianceSummary }) {
  const { label, urgency } = describeStage(stage);

  const tone =
    target === "vendor"
      ? "friendly, simple, plain English, no jargon"
      : "professional broker-facing tone";

  const recipient =
    target === "vendor" ? "vendor contact" : "broker";

  return `
You write renewal reminder emails.

Context:
- Org: ${orgName}
- Vendor: ${vendorName}
- Coverage: ${coverage}
- Stage: ${label} (${stage})
- Days Left: ${daysLeft}
- Expiration: ${expDate}
- Recipient: ${recipient}
- Compliance Summary: ${complianceSummary}
- Urgency: ${urgency}

Rules:
- Write JSON only with subject + body.
- Body must be 4–7 sentences max.
- Ask specifically for updated COI.
- No placeholders like [Name].
- No legalese.

Return JSON:

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

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25,
  });

  const text = completion.choices[0].message.content || "";

  try {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    const parsed = JSON.parse(text.slice(s, e + 1));

    return parsed;
  } catch {
    return {
      subject: `Renewal request — ${params.coverage}`,
      body: text,
    };
  }
}

/* ============================================================
   REAL EMAIL SENDER — RESEND
============================================================ */
async function sendEmailNow({ to, subject, body }) {
  if (!to) return { ok: false, error: "Missing recipient email" };

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text: body,
      reply_to: REPLY_TO,
    });

    if (result?.id) return { ok: true, id: result.id };
    return { ok: false, error: result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ============================================================
   AUTO EMAIL LOOKUP — VENDOR + BROKER EMAILS
============================================================ */
export async function lookupRecipientEmails({ vendorId, policyId }) {
  // Vendor Email
  const vRows = await sql`
    SELECT email
    FROM vendors
    WHERE id = ${vendorId}
    LIMIT 1;
  `;
  const vendorEmail = vRows[0]?.email || null;

  // Broker Email (if stored per policy)
  const pRows = await sql`
    SELECT broker_email
    FROM policies
    WHERE id = ${policyId}
    LIMIT 1;
  `;
  const brokerEmail = pRows[0]?.broker_email || null;

  return { vendorEmail, brokerEmail };
}

/* ============================================================
   ENQUEUE EMAIL
============================================================ */
export async function enqueueRenewalEmail({ orgId, vendorId, policyId, stage, target, toEmail, subject, body, meta = {} }) {
  await sql`
    INSERT INTO renewal_email_queue (
      org_id, vendor_id, policy_id,
      stage, target, to_email,
      subject, body, status, attempts,
      created_at, meta
    ) VALUES (
      ${orgId}, ${vendorId}, ${policyId},
      ${stage}, ${target}, ${toEmail},
      ${subject}, ${body}, 'pending', 0,
      NOW(), ${meta}
    );
  `;
}

/* ============================================================
   PROCESS EMAIL QUEUE
============================================================ */
export async function processRenewalEmailQueue(limit = 25) {
  const pending = await sql`
    SELECT *
    FROM renewal_email_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${limit};
  `;

  const out = [];

  for (const row of pending) {
    const sendRes = await sendEmailNow({
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
      out.push({ id: row.id, status: "sent" });
    } else {
      await sql`
        UPDATE renewal_email_queue
        SET status = 'failed',
            attempts = attempts + 1,
            last_attempt_at = NOW()
        WHERE id = ${row.id};
      `;
      out.push({ id: row.id, status: "failed" });
    }
  }

  return out;
}

/* ============================================================
   HIGH-LEVEL: GENERATE + ENQUEUE (WITH AUTO EMAIL ROUTING)
============================================================ */
export async function planAutoEmailForRenewal({
  scheduleRow,
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  complianceSummary,
}) {
  const { vendorEmail, brokerEmail } = await lookupRecipientEmails({
    vendorId: scheduleRow.vendor_id,
    policyId: scheduleRow.policy_id,
  });

  // Generate AI email content
  const vendorEmailContent = await generateRenewalEmail({
    orgName,
    vendorName,
    coverage,
    stage,
    daysLeft,
    expDate,
    target: "vendor",
    complianceSummary,
  });

  const brokerEmailContent = await generateRenewalEmail({
    orgName,
    vendorName,
    coverage,
    stage,
    daysLeft,
    expDate,
    target: "broker",
    complianceSummary,
  });

  // Queue vendor email
  if (vendorEmail) {
    await enqueueRenewalEmail({
      orgId: scheduleRow.org_id,
      vendorId: scheduleRow.vendor_id,
      policyId: scheduleRow.policy_id,
      stage,
      target: "vendor",
      toEmail: vendorEmail,
      subject: vendorEmailContent.subject,
      body: vendorEmailContent.body,
      meta: {
        coverage, expDate, daysLeft, stage, target: "vendor"
      },
    });
  }

  // Queue broker email (only tight windows)
  if (stage <= 7 && brokerEmail) {
    await enqueueRenewalEmail({
      orgId: scheduleRow.org_id,
      vendorId: scheduleRow.vendor_id,
      policyId: scheduleRow.policy_id,
      stage,
      target: "broker",
      toEmail: brokerEmail,
      subject: brokerEmailContent.subject,
      body: brokerEmailContent.body,
      meta: {
        coverage, expDate, daysLeft, stage, target: "broker"
      },
    });
  }

  return {
    vendor_email_sent: !!vendorEmail,
    broker_email_sent: stage <= 7 && !!brokerEmail,
  };
}
