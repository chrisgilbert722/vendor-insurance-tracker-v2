// pages/api/onboarding/ai-generate-rules.js
// STEP 6 — AI Rule Generation
// Consumes vendor analysis + contract requirements → Returns rule groups for Rule Engine V5

import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  try {
    const { orgId, vendors, vendorAi, requirements } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId." });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- Build AI Prompt ---
    const prompt = `
You are an expert insurance compliance analyst.

Your job is to generate RULE GROUPS for a vendor compliance engine (Rule Engine V5).
You must analyze:

1. Vendor structured data (parsed CSV)
2. Vendor AI risk summaries
3. Contract coverage requirements

Return ONLY valid JSON (no commentary) with this shape:

{
  "groups": [
    {
      "label": "General Liability Requirements",
      "description": "Rules derived from contract GL requirements",
      "rules": [
        {
          "title": "GL Limit Meets Contract Minimum",
          "field": "generalLiabilityLimit",
          "condition": ">=",
          "value": 1000000,
          "severity": "high",
          "message": "General liability limit does not meet the contract minimum."
        }
      ]
    }
  ]
}

RULE LOGIC GUIDANCE:
-----------------------------------------
• Use 2–8 rule groups.
• Each rule group must contain 2–10 rules.
• Severity must be: low, medium, high, or critical.
• Conditions can be: >, <, >=, <=, ==, !=, "exists", "missing"
• For missing coverage in requirements → create a CRITICAL severity rule.
• For expiration logic → include rules such as:
  - "Policy is expired"
  - "Policy expires within 30 days"
• For additional insured / waiver of subrogation → create compliance rules.
• For mismatched coverage → generate clear rules referencing the requirement.
-----------------------------------------

Now analyze the following:

### VENDORS:
${JSON.stringify(vendors, null, 2)}

### VENDOR AI INSIGHTS:
${JSON.stringify(vendorAi, null, 2)}

### CONTRACT REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

Return the final rule groups JSON now.
    `;

    // --- OpenAI Call ---
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: "You generate structured rule groups for a compliance engine.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const raw = response.choices?.[0]?.message?.content;
    const parsed = safeJson(raw);

    if (!parsed || !parsed.groups) {
      console.warn("[ai-generate-rules] AI returned invalid JSON:", raw);
      return res.status(500).json({
        ok: false,
        error: "AI returned invalid rule JSON.",
      });
    }

    return res.status(200).json({
      ok: true,
      groups: parsed.groups,
      summary: "Rule groups generated successfully.",
    });
  } catch (err) {
    console.error("[ai-generate-rules] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI rule generation failed.",
    });
  }
}

// Safely parse AI JSON
function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}
