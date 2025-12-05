// pages/api/alerts/auto-configure.js
// GOD MODE — AI Auto Configure Alert Engine (V1)
// Creates standard alert rules for an organization based on industry, rules, templates, and wizard configuration.

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, industry, alertRecipients } = req.body || {};

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId.",
      });
    }

    const normalizedIndustry = (industry || "general").toLowerCase();
    const recipients =
      Array.isArray(alertRecipients)
        ? alertRecipients
        : typeof alertRecipients === "string"
        ? alertRecipients.split(",").map((s) => s.trim())
        : [];

    // ============================================================
    // BASE ALERT RULES — STANDARD FOR ALL INDUSTRIES
    // ============================================================
    const baseRules = [
      {
        label: "Policy Expiring ≤30 Days",
        condition: "expiration<=30",
        severity: "critical",
        template_key: "renewal_reminder",
        recipients,
      },
      {
        label: "Policy Expiring ≤60 Days",
        condition: "expiration<=60",
        severity: "high",
        template_key: "renewal_reminder",
        recipients,
      },
      {
        label: "Policy Expiring ≤90 Days",
        condition: "expiration<=90",
        severity: "medium",
        template_key: "renewal_reminder",
        recipients,
      },
      {
        label: "Vendor Non-Compliant",
        condition: "non_compliant",
        severity: "critical",
        template_key: "non_compliance_notice",
        recipients,
      },
    ];

    // ============================================================
    // INDUSTRY-SPECIFIC RULES
    // ============================================================
    const industryRules = [];

    if (normalizedIndustry.includes("construction")) {
      industryRules.push(
        {
          label: "Missing Additional Insured Endorsement",
          condition: "missing_ai_endorsement",
          severity: "critical",
          template_key: "non_compliance_notice",
          recipients,
        },
        {
          label: "Missing Waiver of Subrogation",
          condition: "missing_waiver",
          severity: "high",
          template_key: "non_compliance_notice",
          recipients,
        }
      );
    }

    if (normalizedIndustry.includes("healthcare")) {
      industryRules.push({
        label: "Missing Professional / Malpractice Coverage",
        condition: "missing_professional_liability",
        severity: "high",
        template_key: "non_compliance_notice",
        recipients,
      });
    }

    if (normalizedIndustry.includes("property")) {
      industryRules.push({
        label: "Missing General Liability for Property Work",
        condition: "missing_gl_property",
        severity: "high",
        template_key: "non_compliance_notice",
        recipients,
      });
    }

    // Combine rules
    const allRules = [...baseRules, ...industryRules];

    const inserted = [];

    // ============================================================
    // INSERT ALL RULES INTO alert_rules TABLE
    // ============================================================
    for (const rule of allRules) {
      const result = await sql`
        INSERT INTO alert_rules (
          org_id,
          label,
          condition,
          severity,
          recipient_emails,
          template_key,
          active
        )
        VALUES (
          ${orgId},
          ${rule.label},
          ${rule.condition},
          ${rule.severity},
          ${rule.recipients},
          ${rule.template_key},
          true
        )
        RETURNING id, label, severity
      `;
      inserted.push(result[0]);
    }

    return res.status(200).json({
      ok: true,
      message: `Configured ${inserted.length} alert rules for this org.`,
      createdRules: inserted,
      industryUsed: normalizedIndustry,
      recipientsUsed: recipients,
    });
  } catch (err) {
    console.error("[AUTO-CONFIG ALERTS ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "Auto-configure alerts failed.",
      details: err.message,
    });
  }
}
