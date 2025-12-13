// lib/autoEmailBrain.js
// Auto-Email Brain (Phase 3) — LIVE RESEND + BRANDED OUTPUT

import OpenAI from "openai";
import { sql } from "./db";
import { sendEmail } from "./sendEmail";

/* ============================================================
   BRAND CONFIG (YOUR IDENTITY)
============================================================ */
const BRAND = {
  productName: "Vendor Insurance Tracker",
  orgNameFallback: "Compliance Team",
  logoUrl: "https://yourdomain.com/logo.png", // 🔴 replace
  primaryColor: "#38bdf8",
  appUrl: "https://vendor-insurance-tracker-v2.vercel.app",
  supportEmail: "support@yourdomain.com",
};

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
   AI EMAIL PROMPT (CONTENT ONLY)
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
Write a professional compliance reminder email body.

Context:
- Sender Platform: ${BRAND.productName}
- Organization: ${orgName}
- Vendor: ${vendorName}
- Coverage: ${coverage}
- Stage: ${label}
- Days Left: ${daysLeft}
- Expiration Date: ${expDate}
- Recipient Type: ${target}
- Compliance Summary: ${complianceSummary}
- Urgency Level: ${urgency}

Rules:
- Return JSON only
- Provide subject + body
- Body should be 4–6 sentences
- Firm, professional, not friendly
- No emojis
- No placeholders

Format:
{
  "subject": "...",
  "body": "..."
}
`;
}

/* ============================================================
   BRAND HTML WRAPPER
============================================================ */
function wrapBrandedEmail({ subject, body }) {
  return `
  <div style="background:#020617;padding:32px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:620px;margin:auto;background:#0f172a;border-radius:14px;padding:28px">

      <img src="${BRAND.logoUrl}" height="36" alt="${BRAND.productName}" />

      <h2 style="color:#e5e7eb;margin-top:18px">${subject}</h2>

      <div style="color:#cbd5f5;font-size:14px;line-height:1.6;margin-top:14px">
        ${body.replace(/\n/g, "<br/>")}
      </div>

      <a href="${BRAND.appUrl}"
         style="
           display:inline-block;
           margin-top:22px;
           padding:12px 18px;
           border-radius:10px;
           background:${BRAND.primaryColor};
           color:#020617;
           font-weight:600;
           text-decoration:none;
         ">
        Upload Documents / View Compliance
      </a>

      <hr style="margin:26px 0;border:0;border-top:1px solid #1e293b"/>

      <p style="font-size:12px;color:#94a3b8">
        This message was sent by ${BRAND.productName} as part of automated
        compliance monitoring. If you believe this was sent in error,
        contact <a href="mailto:${BRAND.supportEmail}" style="color:#38bdf8">
        ${BRAND.supportEmail}</a>.
      </p>
    </div>
  </div>
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
      subject: `Compliance notice — ${params.coverage}`,
      body: text,
    };
  }
}

/* ============================================================
   LOOKUP — Vendor + Broker Emails
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
  const html = wrapBrandedEmail({ subject, body });

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
      ${subject}, ${html},
      'pending', 0,
      NOW(), ${meta}
    );
  `;
}

/* ============================================================
   PROCESS QUEUE — SEND VIA RESEND
============================================================ */
export async function processRenewalEmailQueue(limit = 25) {
  const rows = await sql`
    SELECT * FROM renewal_email_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${limit};
  `;

  for (const row of rows) {
    const sendRes = await sendEmail({
      to: row.to_email,
      subject: row.subject,
      html: row.body,
    });

    await sql`
      UPDATE renewal_email_queue
      SET status = ${sendRes.ok ? "sent" : "failed"},
          attempts = attempts + 1,
          last_attempt_at = NOW()
      WHERE id = ${row.id};
    `;
  }
}
