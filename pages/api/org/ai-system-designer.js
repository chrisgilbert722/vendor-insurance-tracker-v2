// pages/api/org/ai-system-designer.js
// Org Brain V1 — AI System Designer Engine
// Accepts orgId + natural language prompt, generates full system config:
// - Rule Groups + rules_v3 (auto-saved)
// - Communication templates
// - Summary of changes

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, prompt } = req.body || {};

    if (!orgId || !prompt || !prompt.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or prompt for Org Brain.",
      });
    }

    // ------------------------------------------------------------
    // 1) AI SYSTEM PROMPT — DESIGN ENTIRE COMPLIANCE SYSTEM
    // ------------------------------------------------------------
    const system = {
      role: "system",
      content: `
You are an expert insurance compliance architect for a vendor COI platform.
Your job is to design an entire compliance configuration for an organization.

Given:
- The industry description
- The organization's risk philosophy
- Hints about vendor types

You must output ONLY JSON with this structure:

{
  "summary": "High-level description of the program you designed.",
  "ruleGroups": [
    {
      "label": "string",
      "description": "string",
      "severity": "low|medium|high|critical",
      "rules": [
        {
          "type": "coverage|limit|endorsement|date",
          "field": "gl_limit|auto_limit|umbrella_limit|wc_required|endorsements|expiration_date|... etc",
          "condition": "exists|missing|gte|lte|requires|before|after",
          "value": "string or number",
          "severity": "low|medium|high|critical",
          "message": "human readable rule message"
        }
      ]
    }
  ],
  "templates": {
    "vendorWelcome": "email text",
    "brokerRequest": "email text",
    "renewalReminder": "email text",
    "fixRequest": "email text"
  }
}

Guidelines:
- Use multiple rule groups if appropriate (e.g., General Liability, Auto, WC, Umbrella, Endorsements, High-Risk Trades).
- Severity should reflect actual business risk (roofing can be higher than janitorial).
- "field" names should be realistic keys from a COI/coverage model (e.g., gl_limit, auto_limit, umbrella_limit, wc_required, endorsements, expiration_date).
- "message" should be something an admin would see on a failing row (e.g., "GL Each Occurrence below $1M minimum").
- "summary" must explain the rationale of the configuration in 2–5 sentences.

Output STRICT JSON. No extra commentary.
`,
    };

    const user = {
      role: "user",
      content: `Org ID: ${orgId}\n\nDesign request:\n${prompt}`,
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
      console.error("[OrgBrain] JSON parse error:", err, raw.slice(0, 400));
      return res.status(200).json({
        ok: false,
        error: "AI returned invalid JSON. Try refining your Org Brain prompt.",
        raw,
      });
    }

    const summary = parsed.summary || "";
    const ruleGroups = Array.isArray(parsed.ruleGroups)
      ? parsed.ruleGroups
      : [];
    const templates = parsed.templates || {};

    if (!ruleGroups.length) {
      return res.status(200).json({
        ok: false,
        error: "AI returned no rule groups.",
        summary,
        raw,
      });
    }

    // ------------------------------------------------------------
    // 2) SAVE RULE GROUPS + RULES FOR THIS ORG (AUTO-SAVE)
    // ------------------------------------------------------------

    const savedGroups = [];

    for (const g of ruleGroups) {
      const groupLabel = g.label || "AI Rule Group";
      const groupDesc = g.description || "";
      const groupSeverity = g.severity || "medium";

      // Insert group
      const insertedGroup = await sql`
        INSERT INTO rule_groups (org_id, label, description, severity, active)
        VALUES (${orgId}, ${groupLabel}, ${groupDesc}, ${groupSeverity}, TRUE)
        RETURNING id, label, description, severity;
      `;

      const groupId = insertedGroup[0].id;
      const rules = Array.isArray(g.rules) ? g.rules : [];
      const savedRules = [];

      for (const r of rules) {
        const type = r.type || "coverage";
        const field = r.field || "unknown_field";
        const condition = r.condition || "exists";
        const value = r.value ?? "";
        const severity = r.severity || "medium";
        const message = r.message || "Requirement not met.";

        const insertedRule = await sql`
          INSERT INTO rules_v3 (group_id, type, field, condition, value, message, severity, active)
          VALUES (
            ${groupId},
            ${type},
            ${field},
            ${condition},
            ${String(value)},
            ${message},
            ${severity},
            TRUE
          )
          RETURNING id, type, field, condition, value, message, severity;
        `;

        savedRules.push(insertedRule[0]);
      }

      savedGroups.push({
        group: insertedGroup[0],
        rules: savedRules,
      });
    }

    // NOTE: We are not auto-saving "templates" into a table here
    // because we don't know your template schema. You can later wire:
    // INSERT into org_templates or email_templates if you add such a table.

    // ------------------------------------------------------------
    // 3) RETURN WHAT HAPPENED TO FRONTEND
    // ------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      summary,
      ruleGroups: savedGroups.map((g) => ({
        label: g.group.label,
        description: g.group.description,
        severity: g.group.severity,
        rules: g.rules,
      })),
      templates,
    });
  } catch (err) {
    console.error("[OrgBrain] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI System Designer failed.",
    });
  }
}
