// lib/autoEmailBrain.js
// Auto-Email Brain (Phase 3) — Core logic (FULLY WIRED TO RESEND)

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

// Default sender values (override with env vars)
const FROM_EMAIL = process.env.FROM_EMAIL || "compliance@yourdomain.com";
const REPLY_TO = process.env.REPLY_TO || "support@yourdomain.com";

/* ============================================================
    STAGE → LABEL / URGENCY MAP
============================================================ */
function describeStage(stage) {
  switch (stage) {
    case 0:
      return { label: "Expired", urgency: "max" };
    case 1:
      return { label: "1 Day Left", urgency: "very_high" };
    case 3:
      return { label: "3 Days Left", urgency: "high" };
    case 7:
      return { label: "7-Day Window", urgency: "medium_high" };
    case 30:
      return { label: "30-Day Window", urgency: "medium" };
    case 90:
      return { label: "90-Day Window", urgency: "low" };
    default:
      return { label: "Upcoming", urgency: "low" };
  }
}

/* ============================================================
    BUILD AI EMAIL PROMPT
============================================================ */
function buildEmailPrompt({
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  target, // 'vendor' | 'broker'
  complianceSummary,
}) {
  const { label, urgency } = describeStage(stage);

  const tone =
    target === "vendor"
      ? "friendly, direct, simple, plain English, zero jargon"
      : "professional, concise, broker-facing";

  const recipient =
    target === "vendor" ? "vendor contact" : "broker or underwriter";

  return `
You are an AI that drafts short, highly actionable renewal emails.

Context:
- Organization: ${orgName || "Unknown Org"}
- Vendor: ${vendorName}
- Coverage: ${coverage}
- Renewal Stage: ${label} (stage=${stage}, daysLeft=${daysLeft})
- Expiration Date: ${expDate}
- Recipient type: ${target} (${recipient})
- Compliance summary: ${complianceSummary || "No extra context."}
- Urgency: ${urgency}

Rules:
1. Write a clear subject.
2. Write a short body (4–7 sentences max).
3. Make request explicit (ask for new COI / updated form).
4. Tone must be: ${tone}.
5. DO NOT use placeholders like [Name].
6. DO NOT be dramatic or apologetic.
7. KEEP IT SHORT.

Return ONLY JSON:

{
  "subject": "...",
  "body": "..."
}
`;
}

/* ============================================================
    GENERATE EMAIL FROM AI
============================================================ */
export async function generateRenewalEmail({
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  target,
  complianceSummary,
}) {
  const prompt = buildEmailPrompt({
    orgName,
    vendorName,
    coverage,
    stage,
    daysLeft,
    expDate,
    target,
    complianceSummary,
  });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25,
  });

  const text = completion.choices[0].message.content || "";

  try {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    const json = text.slice(s, e + 1);
    const parsed = JSON.parse(
      json.replace(/```json/gi, "").replace(/```/g, "").trim()
    );

    return {
      subject:
        parsed.subject || `Renewal request — ${coverage} for ${vendorName}`,
      body: parsed.body || text,
    };
  } catch (err) {
    console.error("[AutoEmailBrain] JSON parse failed:", err);
    return {
      subject: `Renewal request — ${coverage} for ${vendorName}`,
      body: text,
    };
  }
}

/* ============================================================
    ENQUEUE EMAIL INTO renewal_email_queue
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
      org_id,
      vendor_id,
      policy_id,
      stage,
      target,
      to_email,
      subject,
      body,
      status,
      attempts,
      created_at,
      meta
    ) VALUES (
      ${orgId},
      ${vendorId},
      ${policyId},
      ${stage},
      ${target},
      ${toEmail || null},
      ${subject},
      ${body},
      'pending',
      0,
      NOW(),
      ${meta}
    );
  `;
}

/* ============================================================
    REAL EMAIL SENDER — RESEND
============================================================ */
async function sendEmailNow({ to, subject, body }) {
  if (!to) {
    console.log("[AutoEmailBrain] Missing recipient email");
    return { ok: false };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text: body,
      reply_to: REPLY_TO,
    });

    if (result?.id) {
      console.log("[AutoEmailBrain] Email sent:", result.id);
      return { ok: true };
    }

    console.error("[AutoEmailBrain] Resend returned:", result);
    return { ok: false, error: result };
  } catch (err) {
    console.error("[AutoEmailBrain] SEND ERROR:", err);
    return { ok: false, error: err.message };
  }
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

  const results = [];

  for (const row of pending) {
    try {
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
    } catch (err) {
      console.error("[AutoEmailBrain] Uncaught send error:", err);

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
    HIGH-LEVEL: GENERATE + ENQUEUE EMAIL FOR A RENEWAL
============================================================ */
export async function planAutoEmailForRenewal({
  scheduleRow,
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  target,          // vendor or broker
  complianceSummary,
  toEmail = null,  // ADD REAL EMAIL HERE WHEN READY
}) {
  const { subject, body } = await generateRenewalEmail({
    orgName,
    vendorName,
    coverage,
    stage,
    daysLeft,
    expDate,
    target,
    complianceSummary,
  });

  await enqueueRenewalEmail({
    orgId: scheduleRow.org_id,
    vendorId: scheduleRow.vendor_id,
    policyId: scheduleRow.policy_id,
    stage,
    target,
    toEmail: toEmail,     // <- when you're ready, pass vendor/broker email
    subject,
    body,
    meta: {
      coverage,
      expDate,
      daysLeft,
      stage,
      target,
    },
  });

  return { subject, body };
}
