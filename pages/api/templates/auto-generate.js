// pages/api/templates/auto-generate.js
// GOD MODE — Auto-Template Generator (V1)
// Generates vendor/broker email templates for an org based on rules + optional industry,
// and returns them as structured JSON (no DB write yet).

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

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
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  try {
    const { orgId, industry, tone } = req.body || {};

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in request body.",
      });
    }

    // Pull a small sample of existing rule groups to give the model context
    let ruleGroupsSample = [];
    try {
      ruleGroupsSample = await sql`
        SELECT label, description, severity
        FROM rule_groups
        WHERE org_id = ${orgId}
        ORDER BY id ASC
        LIMIT 10
      `;
    } catch (err) {
      console.warn("[auto-generate templates] Could not load rule groups:", err);
    }

    const normalizedIndustry = (industry || "").toLowerCase() || "general commercial";
    const normalizedTone = tone || "professional, clear, and firm but friendly";

    const rulesSummary =
      ruleGroupsSample.length === 0
        ? "No rule groups were found for this org."
        : ruleGroupsSample
            .map(
              (g) =>
                `- ${g.label} (severity: ${g.severity}) — ${g.description || ""}`
            )
            .join("\n");

    const systemPrompt = `
You are an expert insurance compliance communications AI.

You generate precise, actionable, legally aware but user-friendly email templates
for vendors and brokers about Certificates of Insurance (COIs), compliance status,
missing coverage, renewals, and onboarding.

Write templates that:
- Are easy to understand by vendors and brokers
- Clearly explain what is missing or required
- Are polite but firm
- Avoid giving legal advice
- Are appropriate for B2B relationships

Industry: ${normalizedIndustry}
Tone: ${normalizedTone}
`;

    const userPrompt = `
Org has the following rule context (sample):

${rulesSummary}

Generate a JSON object ONLY (no commentary, no markdown) with this exact shape:

{
  "vendor_fix": {
    "subject": "string",
    "body": "string"
  },
  "broker_request": {
    "subject": "string",
    "body": "string"
  },
  "renewal_reminder": {
    "subject": "string",
    "body": "string"
  },
  "welcome_onboarding": {
    "subject": "string",
    "body": "string"
  },
  "non_compliance_notice": {
    "subject": "string",
    "body": "string"
  }
}

Where:

- vendor_fix: Email to vendor telling them what is missing/incorrect in their COI and what to fix.
- broker_request: Email to broker requesting updated COI with missing items called out.
- renewal_reminder: Email to vendor reminding them their COI/policy is expiring soon and needs renewal.
- welcome_onboarding: Email welcoming a new vendor and explaining your COI/compliance expectations.
- non_compliance_notice: Email telling a vendor they are currently non-compliant and what happens next.

Important:
- The "body" fields should be multi-paragraph email bodies with placeholders where needed
  (e.g., {{VENDOR_NAME}}, {{DUE_DATE}}, {{MISSING_ITEMS}}, {{OUR_ORG_NAME}}).
- Return ONLY valid JSON. No backticks, no markdown, no explanation.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0].message.content || "";

    let templates;
    try {
      templates = JSON.parse(raw);
    } catch (err) {
      console.error("[auto-generate templates] JSON parse error:", err, raw);
      return res.status(200).json({
        ok: false,
        error:
          "Model did not return valid JSON. Try again or adjust the prompt/tone.",
        raw,
      });
    }

    // Basic sanity check on keys
    const requiredKeys = [
      "vendor_fix",
      "broker_request",
      "renewal_reminder",
      "welcome_onboarding",
      "non_compliance_notice",
    ];

    const missingKeys = requiredKeys.filter((k) => !templates[k]);
    if (missingKeys.length > 0) {
      return res.status(200).json({
        ok: false,
        error: `Generated templates JSON is missing keys: ${missingKeys.join(
          ", "
        )}`,
        templates,
      });
    }

    // V1: We do NOT persist to DB yet. Caller can display, confirm, and then store.
    return res.status(200).json({
      ok: true,
      mode: "preview",
      message:
        "Templates generated successfully. You can persist them to your own templates table if desired.",
      industry: normalizedIndustry,
      tone: normalizedTone,
      sampleRuleGroups: ruleGroupsSample,
      templates,
    });
  } catch (err) {
    console.error("[AUTO-GENERATE TEMPLATES ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "Template auto-generation failed.",
      details: err.message,
    });
  }
}
