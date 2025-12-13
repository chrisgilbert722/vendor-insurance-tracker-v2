// lib/autoEmailBrain.js
// Auto-Email Brain (Phase 3) — BRANDED, RESEND-READY, AUTONOMOUS

import OpenAI from "openai";
import { sql } from "./db";
import { sendEmail } from "./sendEmail";

/* ============================================================
   BRAND CONFIG (YOUR IDENTITY)
============================================================ */
const BRAND = {
  productName: "Vendor Insurance Tracker",
  appUrl: "https://vendor-insurance-tracker-v2.vercel.app",
  logoUrl: "https://vendor-insurance-tracker-v2.vercel.app/logo.png",
  supportEmail: "support@vendorinsurancetracker.com",
  primaryColor: "#38bdf8",
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
   AI PROMPT (CONTENT ONLY)
============================================================ */
function buildEmailPrompt({
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  complianceSummary,
}) {
  const { label, urgency } = describeStage(stage);

  return `
Write a professional compliance reminder email.

Context:
- Product: ${BRAND.productName}
- Org: ${orgName}
- Vendor: ${vendorName}
- Coverage: ${coverage}
- Stage: ${label}
- Days Left: ${daysLeft}
- Expiration Date: ${expDate}
- Urgency: ${urgency}
- Compliance Summary: ${complianceSummary}

Rules:
- Return JSON only
- Fields: subject, body
- Body: 4–6 sentences
- Clear request to upload updated COI
- Authoritative but respectful
- No placeholders

JSON:
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
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: buildEmailPrompt(params) }],
    temperature: 0.2,
  });

  const text = res.choices[0].message.content || "";

  try {
    return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return {
      subject: `Insurance renewal required — ${params.coverage}`,
      body: text,
    };
  }
}

/* ============================================================
   BRAND HTML WRAPPER
============================================================ */
function wrapEmailHtml({ title, body, ctaText, ctaUrl }) {
  return `
  <div style="background:#020617;padding:32px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:600px;margin:auto;background:#0f172a;border-radius:16px;padding:28px;color:#e5e7eb">

      <img src="${BRAND.logoUrl}" alt="${BRAND.productName}" height="40" />

      <h2 style="margin-top:20px">${title}</h2>

      <p style="font-size:14px;line-height:1.6;color:#cbd5f5">
        ${body}
      </p>

      <a href="${ctaUrl}"
         style="
           display:inline-block;
           margin-top:18px;
           padding:12px 18px;
           border-radius:10px;
           background:${BRAND.primaryColor};
           color:#020617;
           text-decoration:none;
           font-weight:600;
         ">
        ${ctaText}
      </a>

      <hr style="margin:24px 0;border-color:#1e293b" />

      <p style="font-size:12px;color:#94a3b8">
        This message was sent by ${BRAND.productName} as part of automated
        compliance monitoring.
      </p>

      <p style="font-size:12px;color:#64748b">
        Questions? Contact <a href="mailto:${BRAND.supportEmail}" style="color:#38bdf8">${BRAND.supportEmail}</a>
      </p>

    </div>
  </div>
  `;
}

/* ============================================================
   QUEUE EMAIL (RESEND-READY)
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
}) {
  const html = wrapEmailHtml({
    title: subject,
    body,
    ctaText: "Upload Updated COI",
    ctaUrl: `${BRAND.appUrl}/upload`,
  });

  await sql`
    INSERT INTO renewal_email_queue (
      org_id, vendor_id, policy_id,
      stage, target, to_email,
      subject, body,
      status, attempts,
      created_at
    ) VALUES (
      ${orgId}, ${vendorId}, ${policyId},
      ${stage}, ${target}, ${toEmail},
      ${subject}, ${html},
      'pending', 0,
      NOW()
    );
  `;
}

/* ============================================================
   PROCESS QUEUE — SEND VIA RESEND
============================================================ */
export async function processRenewalEmailQueue(limit = 25)
