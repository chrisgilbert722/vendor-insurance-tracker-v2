// pages/api/onboarding/ai-wizard.js
// ============================================================
// AI ONBOARDING WIZARD — INDUSTRY + RULE GENERATION (UUID SAFE)
// - Uses resolveOrg (external_uuid -> INT)
// - Safe for autopilot + resume
// - vendorCsv optional (can be stubbed)
// - Logs AI activity for audit / timeline
// ============================================================

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";
import { resolveOrg } from "@resolveOrg";

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { vendorCsv = [] } = req.body || {};

    // 🔑 Resolve external_uuid -> INTERNAL org INT
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    // Normalize vendor input (safe even if empty)
    const vendorText = Array.isArray(vendorCsv)
      ? vendorCsv
          .map(
            (v) =>
              `${v.name || ""}, ${v.email || "no-email"}, ${
                v.category || "uncategorized"
              }`
          )
          .join("\n")
      : "";

    // ---------------- AI PROMPT ----------------
    const system = {
      role: "system",
      content: `
You are the AI Onboarding Wizard for a vendor insurance compliance platform.

Your jobs:

1) INFER INDUSTRIES
- Analyze the vendor list.
- Infer likely industries (Construction, Property Management, Healthcare, etc).
- Return as array.

2) DESIGN RULE ENGINE CONFIGURATION
- Propose realistic insurance rule groups based on industries.
- Include GL, Auto, WC, Umbrella, endorsements.

3) GENERATE COMMUNICATION TEMPLATES
- vendorWelcome
- brokerRequest
- renewalReminder
- fixRequest

4) SUMMARIZE

Return STRICT JSON ONLY in this shape:

{
  "detectedIndustries": [],
  "ruleGroups": [
    {
      "label": "",
      "description": "",
      "severity": "low|medium|high|critical",
      "rules": [
        {
          "type": "coverage|limit|endorsement|date",
          "field": "",
          "condition": "exists|missing|gte|lte|requires|before|after",
          "value": "",
          "severity": "low|medium|high|critical",
          "message": ""
        }
      ]
    }
  ],
  "templates": {
    "vendorWelcome": "",
    "brokerRequest": "",
    "renewalReminder": "",
    "fixRequest": ""
  },
  "summary": ""
}
`,
    };

    const user = {
      role: "user",
      content: `
Vendor list (one per line: name, email, category):
${vendorText || "(no vendors provided yet)"}
`,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [system, user],
    });

    const raw = completion.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[ai-wizard] JSON parse error:", err, raw?.slice(0, 300));
      return res.status(200).json({
        ok: false,
        error: "AI returned invalid JSON.",
        raw,
      });
    }

    const detectedIndustries = Array.isArray(parsed.detectedIndustries)
      ? parsed.detectedIndustries
      : [];
    const ruleGroups = Array.isArray(parsed.ruleGroups)
      ? parsed.ruleGroups
      : [];
    const templates = parsed.templates || {};
    const summary = parsed.summary || "";

    if (!ruleGroups.length) {
      return res.status(200).json({
        ok: false,
        error: "AI did not return any rule groups.",
        detectedIndustries,
        summary,
        templates,
      });
    }

    // ---------------- PERSIST RULE GROUPS ----------------
    const savedGroups = [];
    let totalRules = 0;

    for (const g of ruleGroups) {
      const groupLabel = g.label || "AI Rule Group";
      const groupDesc = g.description || "";
      const groupSeverity = g.severity || "medium";

      const insertedGroup = await sql`
        INSERT INTO rule_groups (org_id, label, description, severity, active)
        VALUES (${orgIdInt}, ${groupLabel}, ${groupDesc}, ${groupSeverity}, TRUE)
        RETURNING id, label, description, severity;
      `;

      const groupId = insertedGroup[0].id;
      const rules = Array.isArray(g.rules) ? g.rules : [];
      const savedRules = [];

      for (const r of rules) {
        const insertedRule = await sql`
          INSERT INTO rules_v3 (
            group_id, type, field, condition, value, message, severity, active
          )
          VALUES (
            ${groupId},
            ${r.type || "coverage"},
            ${r.field || "unknown_field"},
            ${r.condition || "exists"},
            ${String(r.value ?? "")},
            ${r.message || "Requirement not met."},
            ${r.severity || "medium"},
            TRUE
          )
          RETURNING id;
        `;

        savedRules.push(insertedRule[0]);
        totalRules += 1;
      }

      savedGroups.push({
        group: insertedGroup[0],
        rules: savedRules,
      });
    }

    // ---------------- 🔥 AI ACTIVITY LOG ----------------
    await sql`
      INSERT INTO ai_activity_log (org_id, event_type, message, metadata)
      VALUES (
        ${orgIdInt},
        'rules_generated',
        'AI generated compliance rules',
        ${JSON.stringify({
          industries: detectedIndustries,
          ruleGroups: ruleGroups.length,
          totalRules,
        })}
      );
    `;

    return res.status(200).json({
      ok: true,
      detectedIndustries,
      ruleGroups: savedGroups.map((g) => ({
        label: g.group.label,
        description: g.group.description,
        severity: g.group.severity,
        rules: g.rules,
      })),
      templates,
      summary,
    });
  } catch (err) {
    console.error("[AI Onboarding Wizard ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI onboarding failed",
    });
  }
}
