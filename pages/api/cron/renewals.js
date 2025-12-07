// pages/api/cron/renewals.js
// ==========================================================
// FULL AUTOPILOT CRON — Renewals + Email Brain + SLA Engine
// + Broker Escalation Engine (Step 5)
// ==========================================================

import { query, sql } from "../../../lib/db";
import { runRenewalEngineAllOrgsV2 } from "../../../lib/renewalEngineV2";
import { autoEmailBrain, processRenewalEmailQueue } from "../../../lib/autoEmailBrain";
import { openai } from "../../../lib/openaiClient";
import { sendEmail } from "../../../lib/sendEmail";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const jobName = "renewals-cron";
  const startedAt = new Date();

  let summary = {
    renewalEngine: null,
    slaEvents: [],
    queued: 0,
    sent: 0,
    failed: [],
    escalations: []
  };

  try {
    // ======================================================
    // 1️⃣ Run Renewal Engine V2 (your core system)
    // ======================================================
    summary.renewalEngine = await runRenewalEngineAllOrgsV2();

    // ======================================================
    // 2️⃣ SLA INTELLIGENCE + ESCALATION LAYER (V3 + Step 5)
    // ======================================================
    const vendors = await sql`
      SELECT
        v.id AS vendor_id,
        v.vendor_name,
        v.email,
        v.broker_email,
        v.work_type,
        v.org_id,
        v.requirements_json,
        p.expiration_date
      FROM vendors v
      LEFT JOIN policies p ON p.vendor_id = v.id
      ORDER BY v.org_id, v.vendor_name ASC;
    `;

    const now = new Date();

    function computeDays(expStr) {
      if (!expStr) return null;
      const [mm, dd, yyyy] = expStr.split("/");
      const exp = new Date(`${yyyy}-${mm}-${dd}`);
      return isNaN(exp) ? null : Math.floor((exp - now) / 86400000);
    }

    async function hasTimeline(vendorId, action) {
      const r = await sql`
        SELECT id FROM system_timeline
        WHERE vendor_id = ${vendorId} AND action = ${action}
        LIMIT 1;
      `;
      return r.length > 0;
    }

    async function writeTimeline(v, action, message, severity) {
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${v.org_id}, ${v.vendor_id}, ${action}, ${message}, ${severity});
      `;
      summary.slaEvents.push({ vendorId: v.vendor_id, action });
    }

    async function ensureAlert(v, title, severity, rule) {
      const r = await sql`
        SELECT id FROM alerts
        WHERE vendor_id = ${v.vendor_id}
        AND org_id = ${v.org_id}
        AND title = ${title}
        AND status = 'Open'
        LIMIT 1;
      `;
      if (r.length > 0) return;

      await sql`
        INSERT INTO alerts (
          created_at, is_read, org_id, vendor_id, type,
          message, severity, title, rule_label, status
        ) VALUES (
          NOW(), false, ${v.org_id}, ${v.vendor_id}, 'Renewal',
          ${title}, ${severity}, ${title}, ${rule}, 'Open'
        );
      `;
    }

    async function sendAiEmail(v, daysLeft, urgency) {
      if (!v.email) return;

      const prompt = `
Write a short, professional COI renewal reminder email.

Vendor: ${v.vendor_name}
Expiration: ${v.expiration_date}
Days Left: ${daysLeft}
Urgency: ${urgency}

Return JSON ONLY:
{
  "subject": "string",
  "body": "string"
}
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        messages: [
          { role: "system", content: "Return JSON only" },
          { role: "user", content: prompt }
        ]
      });

      const raw = completion.choices[0].message.content.trim();
      const json = JSON.parse(raw.substring(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

      await sendEmail({
        to: v.email,
        subject: json.subject,
        body: json.body
      });

      await writeTimeline(v, "renewal_email_ai_v3", `AI renewal email sent (${urgency})`, "info");
    }

    // ======================================================
    // 🔥 BROKER ESCALATION ENGINE (Step 5)
    // ======================================================
    async function escalateBroker(v, overdueDays) {
      if (!v.broker_email) return;

      await writeTimeline(
        v,
        "broker_escalation",
        `Broker escalation — vendor overdue ${overdueDays} days`,
        "critical"
      );

      await ensureAlert(
        v,
        `Broker Escalation — Vendor Overdue ${overdueDays} Days`,
        "Critical",
        "Renewal Broker Escalation"
      );

      await sendEmail({
        to: v.broker_email,
        subject: `Urgent: Vendor ${v.vendor_name} Insurance Renewal Overdue`,
        body: `
Hello,

Vendor **${v.vendor_name}** is now **${overdueDays} days overdue** on insurance renewal.

Please coordinate with your insured immediately to provide an updated COI.

Thank you,
Compliance Team
        `
      });

      summary.escalations.push({
        vendorId: v.vendor_id,
        type: "broker_escalation",
        overdueDays
      });
    }

    async function escalateInternal(v, overdueDays) {
      const internalEmail = process.env.INTERNAL_COMPLIANCE_EMAIL;
      if (!internalEmail) return;

      await writeTimeline(
        v,
        "internal_escalation",
        `Internal escalation — vendor overdue ${overdueDays} days`,
        "critical"
      );

      await ensureAlert(
        v,
        `Internal Escalation — Vendor Overdue ${overdueDays} Days`,
        "Critical",
        "Renewal Internal Escalation"
      );

      await sendEmail({
        to: internalEmail,
        subject: `Escalation: Vendor ${v.vendor_name} is overdue ${overdueDays} days`,
        body: `
Team,

Vendor **${v.vendor_name}** has failed to provide a valid COI for **${overdueDays} days**.

Immediate internal action is required.

– Automated Compliance System
        `
      });

      summary.escalations.push({
        vendorId: v.vendor_id,
        type: "internal_escalation",
        overdueDays
      });
    }

    async function escalateTermination(v, overdueDays) {
      await writeTimeline(
        v,
        "termination_warning",
        `Vendor suspension warning — overdue ${overdueDays} days`,
        "critical"
      );

      await ensureAlert(
        v,
        `Vendor Suspension Warning — Overdue ${overdueDays} Days`,
        "Critical",
        "Renewal Suspension Warning"
      );

      await sendEmail({
        to: v.email,
        subject: `Final Notice: Insurance Renewal Overdue (${overdueDays} days)`,
        body: `
Hi ${v.vendor_name},

Your insurance renewal has been overdue for **${overdueDays} days**.

If we do not receive an updated Certificate of Insurance immediately,
your authorization to work may be suspended.

Thank you,
Compliance Team
        `
      });

      summary.escalations.push({
        vendorId: v.vendor_id,
        type: "termination_warning",
        overdueDays
      });
    }

    // ======================================================
    // 3️⃣ PROCESS VENDORS
    // ======================================================
    for (const row of vendors) {
      const dte = computeDays(row.expiration_date);
      let stage = "missing";

      if (dte === null) stage = "missing";
      else if (dte < 0) stage = "expired";
      else if (dte <= 3) stage = "3_day";
      else if (dte <= 7) stage = "7_day";
      else if (dte <= 30) stage = "30_day";
      else if (dte <= 90) stage = "90_day";
      else stage = "healthy";

      const v = row;

      // -----------------------------
      // SLA Notices (existing from V3)
      // -----------------------------
      if (stage === "expired" && !(await hasTimeline(v.vendor_id, "sla_expired"))) {
        await writeTimeline(v, "sla_expired", "Policy expired", "critical");
        await ensureAlert(v, "Policy expired — renewal required", "Critical", "Renewal Overdue");
        await sendAiEmail(v, dte, "expired");
      }

      if (stage === "3_day" && !(await hasTimeline(v.vendor_id, "sla_3_day"))) {
        await writeTimeline(v, "sla_3_day", "COI expires in ≤3 days", "high");
        await ensureAlert(v, "COI expires within 3 days", "High", "Renewal 3-Day");
        await sendAiEmail(v, dte, "3_day");
      }

      if (stage === "7_day" && !(await hasTimeline(v.vendor_id, "sla_7_day"))) {
        await writeTimeline(v, "sla_7_day", "COI expires in ≤7 days", "medium");
        await ensureAlert(v, "COI expires within 7 days", "High", "Renewal 7-Day");
        await sendAiEmail(v, dte, "7_day");
      }

      if (stage === "30_day" && !(await hasTimeline(v.vendor_id, "sla_30_day"))) {
        await writeTimeline(v, "sla_30_day", "COI expires within 30 days", "info");
        await ensureAlert(v, "COI expires within 30 days", "Medium", "Renewal 30-Day");
        await sendAiEmail(v, dte, "30_day");
      }

      if (stage === "missing" && !(await hasTimeline(v.vendor_id, "sla_missing"))) {
        await writeTimeline(v, "sla_missing", "Missing expiration date", "warning");
        await ensureAlert(v, "Missing expiration date", "Medium", "Renewal Missing Expiration");
      }

      if (stage === "90_day" && !(await hasTimeline(v.vendor_id, "sla_90_day"))) {
        await writeTimeline(v, "sla_90_day", "COI expires within 90 days", "info");
      }

      // ======================================================
      // 🔥 ESCALATION LOGIC (Step 5)
      // ======================================================
      if (stage === "expired") {
        const overdueDays = Math.abs(dte);

        // 1) EXPIRED > 7 days → BROKER ESCALATION
        if (overdueDays > 7 && v.broker_email && !(await hasTimeline(v.vendor_id, "broker_escalation"))) {
          await escalateBroker(v, overdueDays);
        }

        // 2) EXPIRED > 14 days → INTERNAL ESCALATION
        if (overdueDays > 14 && !(await hasTimeline(v.vendor_id, "internal_escalation"))) {
          await escalateInternal(v, overdueDays);
        }

        // 3) EXPIRED > 30 days → TERMINATION WARNING
        if (overdueDays > 30 && !(await hasTimeline(v.vendor_id, "termination_warning"))) {
          await escalateTermination(v, overdueDays);
        }
      }
    }

    // ======================================================
    // 4️⃣ AUTO EMAIL BRAIN + QUEUE (existing)
    // ======================================================
    const queued = await autoEmailBrain();
    summary.queued = queued?.count || 0;

    const results = await processRenewalEmailQueue(40);
    summary.sent = results.filter(r => r.status === "sent").length;
    summary.failed = results.filter(r => r.status === "failed").map(r => r.id);

    // ======================================================
    // 5️⃣ HEARTBEAT LOGGING
    // ======================================================
    await query(
      `
      INSERT INTO cron_renewals_heartbeat
      (job_name, last_run_at, last_status, last_error, run_count)
      VALUES ($1, NOW(), 'ok', '', 1)
      ON CONFLICT (job_name)
      DO UPDATE SET
        last_run_at = NOW(),
        last_status = 'ok',
        last_error = '',
        run_count = cron_renewals_heartbeat.run_count + 1,
        updated_at = NOW()
      `,
      jobName
    );

    return res.status(200).json({
      ok: true,
      jobName,
      startedAt,
      finishedAt: new Date(),
      summary,
    });

  } catch (err) {
    const msg = err?.message || "Unknown error";

    await query(
      `
      INSERT INTO cron_renewals_heartbeat
      (job_name, last_run_at, last_status, last_error, run_count)
      VALUES ($1, NOW(), 'error', $2, 1)
      ON CONFLICT (job_name)
      DO UPDATE SET
        last_run_at = NOW(),
        last_status = 'error',
        last_error = $2,
        run_count = cron_renewals_heartbeat.run_count + 1,
        updated_at = NOW()
      `,
      jobName,
      msg
    );

    return res.status(500).json({ ok: false, jobName, error: msg });
  }
}
