// pages/api/alerts/run-cron.js
// ALERT ENGINE CRON RUNNER — GOD MODE
// Evaluates alert_rules for an org, creates vendor_alerts, and sends emails using templates.

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

/**
 * GET /api/alerts/run-cron?orgId=...
 *
 * Intended to be called by Vercel Cron or manually (Power Mode "run alerts now").
 *
 * 1) Loads alert_rules for the org
 * 2) Loads vendors + policies + failing rule counts
 * 3) Evaluates each alert_rule
 * 4) Creates rows in vendor_alerts (APPEND)
 * 5) Sends emails using /api/notifications/send when applicable
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in query.",
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
    if (!baseUrl) {
      console.warn("[alerts/run-cron] Missing NEXT_PUBLIC_BASE_URL");
    }

    // ============================================================
    // 1) LOAD ALERT RULES
    // ============================================================
    const alertRules = await sql`
      SELECT id, label, condition, severity, recipient_emails, template_key
      FROM alert_rules
      WHERE org_id = ${orgId} AND active = true
    `;

    if (!alertRules.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        message: "No active alert_rules for this org.",
        alertsCreated: 0,
        emailsSent: 0,
      });
    }

    // ============================================================
    // 2) LOAD VENDORS + POLICIES
    // ============================================================
    const vendors = await sql`
      SELECT id, vendor_name
      FROM vendors
      WHERE org_id = ${orgId}
    `;

    if (!vendors.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        message: "No vendors found; nothing to evaluate.",
        alertsCreated: 0,
        emailsSent: 0,
      });
    }

    const vendorIds = vendors.map((v) => v.id);

    const policies = await sql`
      SELECT vendor_id, expiration_date
      FROM policies
      WHERE vendor_id = ANY(${vendorIds})
    `;

    // Map vendor -> earliest expiration date
    const policyMap = {};
    for (const p of policies) {
      if (!p.expiration_date) continue;
      const key = p.vendor_id;
      const d = new Date(p.expiration_date);
      if (Number.isNaN(d.getTime())) continue;
      if (!policyMap[key] || d < policyMap[key]) {
        policyMap[key] = d;
      }
    }

    // ============================================================
    // 3) LOAD NON-COMPLIANT INFO (rule_results_v3)
    // ============================================================
    const nonCompliantRows = await sql`
      SELECT vendor_id, COUNT(*) AS failing_count
      FROM rule_results_v3
      WHERE org_id = ${orgId} AND passed = false
      GROUP BY vendor_id
    `;

    const nonCompliantMap = {};
    for (const r of nonCompliantRows) {
      nonCompliantMap[r.vendor_id] = Number(r.failing_count) || 0;
    }

    // Build helpful vendor index
    const vendorIndex = {};
    for (const v of vendors) {
      vendorIndex[v.id] = v.vendor_name || `Vendor ${v.id}`;
    }

    const now = new Date();
    const alertsToInsert = [];
    const emailsToSend = [];

    // ============================================================
    // 4) EVALUATION HELPERS
    // ============================================================

    function daysUntil(dateObj) {
      if (!dateObj) return null;
      const diffMs = dateObj.getTime() - now.getTime();
      return Math.floor(diffMs / 86400000); // ms → days
    }

    function shouldTrigger(rule, vendorId) {
      const condition = String(rule.condition || "").toLowerCase();

      // expiration<=X
      if (condition.startsWith("expiration<=")) {
        const parts = condition.split("<=");
        const thresholdDays = parseInt(parts[1], 10);
        const exp = policyMap[vendorId] || null;
        if (!exp) return false;
        const dLeft = daysUntil(exp);
        return dLeft !== null && dLeft <= thresholdDays;
      }

      // non_compliant
      if (condition === "non_compliant") {
        return (nonCompliantMap[vendorId] || 0) > 0;
      }

      // more advanced conditions (endorsements, etc.) could be added later
      return false;
    }

    // ============================================================
    // 5) EVALUATE RULES AGAINST ALL VENDORS
    // ============================================================
    for (const rule of alertRules) {
      for (const vid of vendorIds) {
        if (!shouldTrigger(rule, vid)) continue;

        const vendorName = vendorIndex[vid] || `Vendor ${vid}`;

        const code = rule.condition;
        const message = rule.label;

        alertsToInsert.push({
          vendorId: vid,
          orgId,
          code,
          message,
          severity: rule.severity,
          templateKey: rule.template_key,
          recipients: rule.recipient_emails || [],
          vendorName,
        });
      }
    }

    if (!alertsToInsert.length) {
      return res.status(200).json({
        ok: true,
        orgId,
        message: "No alerts triggered for this run.",
        alertsCreated: 0,
        emailsSent: 0,
      });
    }

    // ============================================================
    // 6) WRITE ALERTS TO vendor_alerts (APPEND MODE)
    // ============================================================
    let alertsCreated = 0;
    for (const a of alertsToInsert) {
      await sql`
        INSERT INTO vendor_alerts (vendor_id, org_id, code, message, severity, created_at)
        VALUES (${a.vendorId}, ${a.orgId}, ${a.code}, ${a.message}, ${a.severity}, NOW())
      `;
      alertsCreated++;
    }

    // ============================================================
    // 7) SEND EMAILS VIA /api/notifications/send
    // ============================================================
    let emailsSent = 0;

    for (const a of alertsToInsert) {
      const templateKey = a.templateKey;
      const recipients = Array.isArray(a.recipients)
        ? a.recipients
        : [];

      if (!templateKey || !recipients.length) {
        continue; // nothing to send
      }

      for (const email of recipients) {
        if (!email) continue;
        try {
          const payload = {
            orgId,
            to: email,
            templateKey,
            bodyParams: {
              VENDOR_NAME: a.vendorName,
              OUR_ORG_NAME: "Your Organization",
              ALERT_CODE: a.code,
              ALERT_MESSAGE: a.message,
              SEVERITY: a.severity,
            },
          };

          const sendRes = await fetch(
            `${baseUrl}/api/notifications/send`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          const sendJson = await sendRes.json();
          if (sendJson.ok) {
            emailsSent++;
          } else {
            console.error(
              "[alerts/run-cron] Email send failed:",
              sendJson.error
            );
          }
        } catch (err) {
          console.error("[alerts/run-cron] Email send error:", err);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      orgId,
      message: `Alert cron run complete.`,
      alertsCreated,
      emailsSent,
    });
  } catch (err) {
    console.error("[alerts/run-cron] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Alert cron runner failed.",
    });
  }
}
