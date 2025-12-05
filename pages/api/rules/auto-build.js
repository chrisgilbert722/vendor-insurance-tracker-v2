// pages/api/rules/auto-build.js
// GOD MODE — Auto-Rule Generator (V1)
// Builds a standard set of rule groups + rules for an org, based on optional industry.

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

function buildRuleTemplate(industryRaw) {
  const industry = (industryRaw || "").toLowerCase();

  // Base/default rules (works for most general/commercial use)
  const baseGroups = [
    {
      label: "General Liability — Core Requirements",
      severity: "high",
      description:
        "Ensures vendors maintain active general liability coverage with sufficient limits.",
      rules: [
        {
          type: "expiration",
          field: "expiration_date",
          condition: ">=days",
          value: "30",
          severity: "critical",
          message:
            "Policy must not expire within 30 days. Renew or obtain updated COI.",
        },
        {
          type: "limit_min",
          field: "limit_each_occurrence",
          condition: ">=amount",
          value: "1000000",
          severity: "high",
          message: "General liability each occurrence limit must be at least $1M.",
        },
      ],
    },
    {
      label: "Auto Liability — If Driving Exposure Exists",
      severity: "medium",
      description:
        "Ensures vendors who drive on behalf of the organization have adequate auto liability.",
      rules: [
        {
          type: "limit_min",
          field: "auto_limit",
          condition: ">=amount",
          value: "1000000",
          severity: "high",
          message: "Auto liability limit must be at least $1M combined single limit.",
        },
      ],
    },
    {
      label: "Workers' Compensation & Employers Liability",
      severity: "high",
      description:
        "Ensures vendors with employees carry workers' compensation and employers liability coverage.",
      rules: [
        {
          type: "presence",
          field: "work_comp_limit",
          condition: "exists",
          value: "",
          severity: "high",
          message:
            "Workers' compensation coverage is required for vendors with employees.",
        },
      ],
    },
    {
      label: "Umbrella / Excess Liability (High-Risk Vendors)",
      severity: "medium",
      description:
        "Adds umbrella limits for vendors performing high-risk work or large contracts.",
      rules: [
        {
          type: "limit_min",
          field: "umbrella_limit",
          condition: ">=amount",
          value: "1000000",
          severity: "medium",
          message: "Umbrella / excess liability limit should be at least $1M.",
        },
      ],
    },
  ];

  if (industry.includes("construction")) {
    // Add some construction-focused rules on top of base
    baseGroups.push({
      label: "Construction Endorsements — AI / Waiver / Primary",
      severity: "critical",
      description:
        "Construction vendors must provide key endorsements like Additional Insured and Waiver of Subrogation.",
      rules: [
        {
          type: "endorsement_required",
          field: "endorsements",
          condition: "includes",
          value: "Additional Insured",
          severity: "critical",
          message:
            "Construction vendors must list owner/GC as Additional Insured on GL.",
        },
        {
          type: "endorsement_required",
          field: "endorsements",
          condition: "includes",
          value: "Waiver of Subrogation",
          severity: "high",
          message:
            "Construction vendors should provide Waiver of Subrogation where required by contract.",
        },
        {
          type: "endorsement_required",
          field: "endorsements",
          condition: "includes",
          value: "Primary & Noncontributory",
          severity: "medium",
          message:
            "Primary & Noncontributory wording is recommended on GL for construction vendors.",
        },
      ],
    });
  } else if (industry.includes("healthcare")) {
    baseGroups.push({
      label: "Healthcare — Professional / Malpractice Coverage",
      severity: "high",
      description:
        "Ensures healthcare vendors carry appropriate professional or malpractice coverage.",
      rules: [
        {
          type: "presence",
          field: "professional_liability_limit",
          condition: "exists",
          value: "",
          severity: "high",
          message:
            "Healthcare-related vendors must provide professional or malpractice liability coverage.",
        },
      ],
    });
  }

  return baseGroups;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  try {
    const { orgId, industry, dryRun } = req.body || {};

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in request body.",
      });
    }

    // Build a template of rule groups + rules based on industry
    const ruleGroups = buildRuleTemplate(industry);

    // If dryRun is true, do not touch the database — just return the plan
    if (dryRun) {
      return res.status(200).json({
        ok: true,
        mode: "dryRun",
        message:
          "Auto-build rule plan generated, but not applied because dryRun=true.",
        groups: ruleGroups,
      });
    }

    const createdGroups = [];
    const createdRules = [];

    // Optional: you might want to clear existing auto-generated groups here.
    // For safety in V1, we only append new groups.

    for (const group of ruleGroups) {
      const insertedGroup = await sql`
        INSERT INTO rule_groups (
          org_id,
          label,
          description,
          severity
        )
        VALUES (
          ${orgId},
          ${group.label},
          ${group.description},
          ${group.severity}
        )
        RETURNING id, label, severity
      `;

      const groupId = insertedGroup[0].id;
      createdGroups.push(insertedGroup[0]);

      for (const r of group.rules || []) {
        const insertedRule = await sql`
          INSERT INTO rules (
            org_id,
            group_id,
            type,
            field,
            condition,
            value,
            severity,
            message
          )
          VALUES (
            ${orgId},
            ${groupId},
            ${r.type},
            ${r.field},
            ${r.condition},
            ${r.value},
            ${r.severity},
            ${r.message}
          )
          RETURNING id, type, field, severity
        `;
        createdRules.push(insertedRule[0]);
      }
    }

    return res.status(200).json({
      ok: true,
      message: `Auto-built ${createdGroups.length} rule groups with ${createdRules.length} rules.`,
      groupsCreated: createdGroups.length,
      rulesCreated: createdRules.length,
      groups: ruleGroups,
    });
  } catch (err) {
    console.error("[AUTO-BUILD RULES ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "Auto-build rules failed.",
      details: err.message,
    });
  }
}
