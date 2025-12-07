// pages/api/renewals/cron-run.js
// ==========================================================
// RENEWAL INTELLIGENCE V3 — CRON ENGINE (Step 1)
// Daily renewal automation:
// - Computes days to expiration for all vendors
// - Determines SLA stage
// - Sends AI renewal emails at 30d / 7d / expired
// - Writes timeline events
// - Creates renewal alerts (basic version)
// ==========================================================

import { sql } from "../../../lib/db";
import { sendEmail } from "../../../lib/sendEmail";
import { openai } from "../../../lib/openaiClient";

/**
 * Optional: protect this route with a CRON_SECRET in your env
 * and Vercel cron header (e.g., x-cron-key).
 * For now it's open to simplify internal testing.
 */

export default async function handler(req, res) {
  try {
    // Allow GET or POST based cron
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({ ok: false, error: "Use GET or POST" });
    }

    const orgId = req.query.orgId || 1;

    // 1️⃣ Fetch vendor + policy expiration data
    const rows = await sql`
      SELECT
        v.id AS vendor_id,
        v.vendor_name,
        v.org_id,
        v.email,
        v.requirements_json,
        v.last_uploaded_coi,
        v.last_uploaded_at,
        p.policy_number,
        p.carrier,
        p.expiration_date
      FROM vendors v
      LEFT JOIN policies p ON p.vendor_id = v.id
      WHERE v.org_id = ${orgId}
      ORDER BY v.vendor_name ASC;
    `;

    if (rows.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "No vendors found; cron completed.",
        vendorsProcessed: 0,
      });
    }

    const now = new Date();
    const actionsTaken = [];

    // Utility to compute daysToExpire
    function getDaysToExpire(expirationDateStr) {
      if (!expirationDateStr) return null;
      const parts = expirationDateStr.split("/");
      if (parts.length !== 3) return null;
      const [mm, dd, yyyy] = parts;
      const exp = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      if (Number.isNaN(exp.getTime())) return null;
      const diffMs = exp.getTime() - now.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    // Helper: check if we've already created an SLA event for this vendor/stage
    async function hasExistingSlaEvent(vendorId, stageKey) {
      const result = await sql`
        SELECT id
        FROM system_timeline
        WHERE vendor_id = ${vendorId}
          AND action = ${stageKey}
        LIMIT 1;
      `;
      return result.length > 0;
    }

    // Helper: create a timeline event
    async function logTimeline(orgId, vendorId, action, message, severity = "info") {
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, ${action}, ${message}, ${severity});
      `;
    }

    // Helper: create a basic renewal alert (if not already open)
    async function createRenewalAlertIfMissing(orgId, vendorId, title, severityLabel, ruleLabel) {
      const existing = await sql`
        SELECT id
        FROM alerts
        WHERE org_id = ${orgId}
          AND vendor_id = ${vendorId}
          AND title = ${title}
          AND status = 'Open'
        LIMIT 1;
      `;
      if (existing.length > 0) return;

      await sql`
        INSERT INTO alerts (
          created_at,
          is_read,
          org_id,
          vendor_id,
          type,
          message,
          severity,
          title,
          rule_label,
          status
        )
        VALUES (
          NOW(),
          false,
          ${orgId},
          ${vendorId},
          'Renewal',
          ${title},
          ${severityLabel},
          ${title},
          ${ruleLabel},
          'Open'
        );
      `;
    }

    // Helper: send renewal email using inline AI (slightly simpler than hitting send-email-ai)
    async function sendRenewalEmailAi(vendor, daysToExpire) {
      if (!vendor.email) return null;

      let urgency = "standard";
      if (daysToExpire === null) urgency = "unknown";
      else if (daysToExpire < 0) urgency = "expired";
      else if (daysToExpire <= 7) urgency = "7_day";
      else if (daysToExpire <= 30) urgency = "30_day";

      const prompt = `
You are an insurance compliance assistant.

Write a short, professional email from a company's compliance team to one of its vendors reminding them to send or update their Certificate of Insurance (COI).

Context:
- Vendor name: ${vendor.vendor_name || "Vendor"}
- Work type: ${vendor.work_type || "Unknown"}
- Policy expiration date: ${vendor.expiration_date || "Unknown"}
- Days until expiration: ${daysToExpire === null ? "unknown" : daysToExpire}
- Urgency tier: ${urgency}
- Requirements (JSON):
${JSON.stringify(vendor.requirements_json || {}, null, 2)}

Guidelines:
- Tone: clear, respectful, firm but not aggressive.
- If urgency is "expired": emphasize immediate action and risk of suspension.
- If "7_day": emphasize urgency and risk of lapse.
- If "30_day": friendly reminder to renew early.
- If daysToExpire is unknown: ask them to confirm coverage and send a current COI.
- 2–4 short paragraphs max.
- No legal jargon.

Return JSON ONLY:
{
  "subject": "string",
  "body": "string with line breaks"
}
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
      });

      let raw = completion.choices[0].message?.content?.trim() || "{}";
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      const json = JSON.parse(raw.slice(first, last + 1));

      const subject =
        json.subject ||
        `Insurance COI Renewal Request for ${vendor.vendor_name || "Vendor"}`;
      const body =
        json.body ||
        `
Hi ${vendor.vendor_name || "there"},

This is a reminder to send us your updated Certificate of Insurance.

Thank you,
Compliance Team
      `.trim();

      await sendEmail({
        to: vendor.email,
        subject,
        body,
      });

      await logTimeline(
        vendor.org_id,
        vendor.vendor_id,
        "renewal_email_sent_ai_cron",
        `AI renewal email sent via cron to ${vendor.email}`,
        "info"
      );

      return { subject, body };
    }

    // 2️⃣ Process each vendor
    for (const row of rows) {
      const daysToExpire = getDaysToExpire(row.expiration_date);

      let stage = "missing"; // missing, 90, 30, 7, 3, expired
      if (daysToExpire === null) {
        stage = "missing";
      } else if (daysToExpire < 0) {
        stage = "expired";
      } else if (daysToExpire <= 3) {
        stage = "3_day";
      } else if (daysToExpire <= 7) {
        stage = "7_day";
      } else if (daysToExpire <= 30) {
        stage = "30_day";
      } else if (daysToExpire <= 90) {
        stage = "90_day";
      } else {
        stage = "healthy";
      }

      // We only escalate on specific stages
      const vendor = {
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
        org_id: row.org_id,
        email: row.email,
        expiration_date: row.expiration_date,
        requirements_json: row.requirements_json,
        daysToExpire,
      };

      switch (stage) {
        case "expired": {
          const actionKey = "renewal_sla_expired";
          if (!(await hasExistingSlaEvent(row.vendor_id, actionKey))) {
            await logTimeline(
              orgId,
              row.vendor_id,
              actionKey,
              "Policy is expired — renewal overdue.",
              "critical"
            );
            await createRenewalAlertIfMissing(
              orgId,
              row.vendor_id,
              "Policy expired — renewal required",
              "Critical",
              "Renewal Overdue"
            );
            // Try to send AI email
            await sendRenewalEmailAi(vendor, daysToExpire);
            actionsTaken.push({
              vendorId: row.vendor_id,
              stage,
              action: "expired_email",
            });
          }
          break;
        }

        case "3_day": {
          const actionKey = "renewal_sla_3_day";
          if (!(await hasExistingSlaEvent(row.vendor_id, actionKey))) {
            await logTimeline(
              orgId,
              row.vendor_id,
              actionKey,
              "COI expires in ≤ 3 days. Critical renewal stage.",
              "high"
            );
            await createRenewalAlertIfMissing(
              orgId,
              row.vendor_id,
              "COI expires within 3 days",
              "High",
              "Renewal 3-Day"
            );
            await sendRenewalEmailAi(vendor, daysToExpire);
            actionsTaken.push({
              vendorId: row.vendor_id,
              stage,
              action: "3_day_email",
            });
          }
          break;
        }

        case "7_day": {
          const actionKey = "renewal_sla_7_day";
          if (!(await hasExistingSlaEvent(row.vendor_id, actionKey))) {
            await logTimeline(
              orgId,
              row.vendor_id,
              actionKey,
              "COI expires in ≤ 7 days. High urgency renewal stage.",
              "medium"
            );
            await createRenewalAlertIfMissing(
              orgId,
              row.vendor_id,
              "COI expires within 7 days",
              "High",
              "Renewal 7-Day"
            );
            await sendRenewalEmailAi(vendor, daysToExpire);
            actionsTaken.push({
              vendorId: row.vendor_id,
              stage,
              action: "7_day_email",
            });
          }
          break;
        }

        case "30_day": {
          const actionKey = "renewal_sla_30_day";
          if (!(await hasExistingSlaEvent(row.vendor_id, actionKey))) {
            await logTimeline(
              orgId,
              row.vendor_id,
              actionKey,
              "COI expires in ≤ 30 days. Renewal cycle start.",
              "info"
            );
            await createRenewalAlertIfMissing(
              orgId,
              row.vendor_id,
              "COI expires within 30 days",
              "Medium",
              "Renewal 30-Day"
            );
            await sendRenewalEmailAi(vendor, daysToExpire);
            actionsTaken.push({
              vendorId: row.vendor_id,
              stage,
              action: "30_day_email",
            });
          }
          break;
        }

        case "90_day": {
          const actionKey = "renewal_sla_90_day";
          if (!(await hasExistingSlaEvent(row.vendor_id, actionKey))) {
            await logTimeline(
              orgId,
              row.vendor_id,
              actionKey,
              "COI expires within 90 days. Low urgency notice.",
              "info"
            );
            actionsTaken.push({
              vendorId: row.vendor_id,
              stage,
              action: "90_day_log",
            });
          }
          break;
        }

        case "missing": {
          const actionKey = "renewal_sla_missing_expiration";
          if (!(await hasExistingSlaEvent(row.vendor_id, actionKey))) {
            await logTimeline(
              orgId,
              row.vendor_id,
              actionKey,
              "Missing expiration date — cannot compute renewal SLA.",
              "warning"
            );
            await createRenewalAlertIfMissing(
              orgId,
              row.vendor_id,
              "Missing expiration date",
              "Medium",
              "Renewal Missing Expiration"
            );
            actionsTaken.push({
              vendorId: row.vendor_id,
              stage,
              action: "missing_exp_log",
            });
          }
          break;
        }

        default:
          // healthy — no action
          break;
      }
    }

    return res.status(200).json({
      ok: true,
      vendorsProcessed: rows.length,
      actionsTakenCount: actionsTaken.length,
      actionsTaken,
    });
  } catch (err) {
    console.error("[RENEWAL CRON ENGINE ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
