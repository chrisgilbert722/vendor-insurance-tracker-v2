// pages/api/onboarding/ai-wizard.js
// AI Onboarding Wizard — Now with Automatic Industry Detection

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, vendorCsv } = req.body;

    if (!orgId || !vendorCsv) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId or vendorCsv" });
    }

    // vendorCsv: array of { name, email, category }
    const vendorText = vendorCsv
      .map(
        (v) =>
          `${v.name || ""}, ${v.email || "no-email"}, ${
            v.category || "uncategorized"
          }`
      )
      .join("\n");

    // ---------------- AI PROMPT ----------------
    const system = {
      role: "system",
      content: `
You are the AI Onboarding Wizard for a vendor insurance compliance platform.

Your jobs:

1) INFER INDUSTRIES
- Analyze the vendor list (names, categories, implied services).
- Infer one or more likely industries this organization operates in.
- Examples: "Construction", "Property Management", "Healthcare", "Manufacturing", "Retail", "Hospitality", "Transportation", etc.
- Output them as an array: ["Construction", "Property Management"].

2) DESIGN RULE ENGINE CONFIGURATION
- Based on detected industries AND the vendor list, propose a reasonable set of rule groups and rules.
- Use realistic, sensible requirements for that industry mix:
  - GL, Auto, WC, Umbrella
  - Endorsements (Additional Insured, Waiver of Subrogation, Primary/Non-Contributory)
  - Higher limits for high-risk trades.

3) GENERATE COMMUNICATION TEMPLATES
- vendorWelcome: email inviting vendors to upload COIs.
- brokerRequest: email requesting updated COIs from brokers.
- renewalReminder: friendly but firm reminder about upcoming expiration.
- fixRequest: email explaining what’s missing / incorrect.

4) SUMMARIZE
- Provide a short summary explaining:
  - The industries you detected.
  - The logic behind the requirements.
  - Any special handling for high-risk vendor types.

Return STRICT JSON ONLY in this shape:

{
  "detectedIndustries": ["..."],
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
          "value": "string or number",
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
      content: `Org ID: ${orgId}\n\nVendor list (one per line: name, email, category):\n${vendorText}`,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [system, user],
    });

    const raw = completion.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("JSON parse error in ai-wizard:", err, raw?.slice(0, 400));
      return res.status(200).json({
        ok: false,
        error: "AI returned invalid JSON. Try refining your CSV or trying again.",
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
        raw,
      });
    }

    // ---------------- PERSIST RULE GROUPS + RULES ----------------
    const savedGroups = [];

    for (const g of ruleGroups) {
      const groupLabel = g.label || "AI Rule Group";
      const groupDesc = g.description || "";
      const groupSeverity = g.severity || "medium";

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
    return res.status(500).json({ ok: false, error: err.message });
  }
}
