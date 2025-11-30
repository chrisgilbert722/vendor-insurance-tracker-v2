// lib/autoEmailBrain.js
// Auto-Email Brain (Phase 3) — Core logic

import OpenAI from "openai";
import { sql } from "./db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Map renewal stage to human label and urgency.
 */
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

/**
 * Build AI prompt for email generation.
 */
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
      ? "friendly, direct, no jargon, easy to understand"
      : "professional, concise, broker-to-underwriter tone";

  const recipient =
    target === "vendor"
      ? "vendor contact"
      : "broker or underwriter";

  return `
You are an AI that drafts short, practical renewal emails.

Context:
- Organization: ${orgName || "Unknown Org"}
- Vendor: ${vendorName}
- Coverage: ${coverage}
- Renewal Stage: ${label} (stage=${stage}, daysLeft=${daysLeft})
- Expiration Date: ${expDate}
- Recipient type: ${target} (${recipient})
- Compliance summary: ${complianceSummary || "No extra context."}
- Urgency level: ${urgency}

Requirements:
1. Generate a clear, specific SUBJECT line.
2. Generate a BODY that:
   - States the coverage and expiration clearly.
   - Explains urgency in plain language.
   - Requests the updated COI (or endorsement) with any missing items implied.
   - Keeps it short (4–7 sentences).
   - Ends with a simple closing.
3. Tone: ${tone}.
4. Do NOT use filler, legalese, or apologies.
5. Do NOT add placeholders like [Name] — write generic yet usable content.

Return JSON ONLY:

{
  "subject": "...",
  "body": "..."
}
`;
}

/**
 * Use OpenAI to generate an email.
 */
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
    temperature: 0.2,
  });

  const text = completion.choices[0].message.content || "";

  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const chunk = text.slice(start, end + 1);
    const parsed = JSON.parse(
      chunk.replace(/```json/gi, "").replace(/```/g, "").trim()
    );

    return {
      subject:
        parsed.subject ||
        `Renewal request — ${coverage} for ${vendorName}`,
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

/**
 * Enqueue an email into renewal_email_queue.
 */
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

/**
 * Stub: send an email — replace with Resend/SendGrid/etc.
 */
async function sendEmailNow({ to, subject, body }) {
  // TODO: integrate actual email provider here.
  console.log("[SEND EMAIL]", { to, subject });
  // Simulate success:
  return { ok: true };
}

/**
 * Process pending queued emails (limit: number per run).
 */
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
      const toEmail =
        row.to_email ||
        null; // Populate real addresses later from vendor/broker table.

      const sendRes = await sendEmailNow({
        to: toEmail,
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
      console.error("[AutoEmailBrain] send error:", err);
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

/**
 * High-level helper — generate + enqueue a renewal email
 * for a given schedule row + target.
 */
export async function planAutoEmailForRenewal({
  scheduleRow,
  orgName,
  vendorName,
  coverage,
  stage,
  daysLeft,
  expDate,
  target,
  complianceSummary,
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
    toEmail: null, // fill in later,
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
