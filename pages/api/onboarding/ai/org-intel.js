// pages/api/onboarding/ai/org-intel.js
// AI Organization Intelligence for Onboarding Wizard
import { sql } from "../../../../lib/db";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { orgId, companyName, industry, hqLocation, vendorCount } = req.body;

    if (!orgId || !companyName || !industry) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId, companyName, or industry",
      });
    }

    // Build AI prompt
    const prompt = `
You are an expert in vendor insurance, compliance, and risk management.
Your job: Configure recommended insurance coverages, rule defaults, AND internal team recommendations
for a new organization onboarding to a vendor compliance platform.

Organization:
- Name: ${companyName}
- Industry: ${industry}
- HQ Location: ${hqLocation || "Unknown"}
- Approx Vendor Count: ${vendorCount || "Unknown"}

Return STRICT JSON ONLY with:

{
  "coverages": [
    {
      "name": "General Liability",
      "required": true,
      "recommendedLimitEachOccurrence": 1000000,
      "recommendedAggregate": 2000000,
      "endorsements": ["Additional Insured", "Primary & Non-Contributory", "Waiver of Subrogation"]
    }
  ],
  "rulesDefaults": {
    "strictness": "lenient | balanced | strict",
    "expirationWarningDays": 30,
    "defaultMissingSeverity": "low | medium | high"
  },
  "riskScore": 0-100,

  "teamSuggestions": [
    "risk.manager@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com",
    "ops.director@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com"
  ],

  "teamRoles": {
    "risk.manager": "Oversees compliance, renewal follow-ups, and rule management",
    "ops.director": "Oversees day-to-day vendor operations and exception approvals"
  },

  "teamNotes": "Short explanation of why these roles matter in vendor insurance compliance."

}

Return ONLY valid JSON, nothing else.
`;

    // AI call
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content || "{}";

    // Attempt to parse JSON from AI output
    let ai;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      ai = JSON.parse(text.slice(jsonStart, jsonEnd));
    } catch (err) {
      console.error("[org-intel] JSON parse error:", err, text);
      return res.status(500).json({ ok: false, error: "AI JSON parse error" });
    }

    // Rule defaults sanity
    const rulesDefaults = ai.rulesDefaults || {};
    const strictness = rulesDefaults.strictness || "balanced";
    const expirationWarningDays = rulesDefaults.expirationWarningDays || 30;
    const defaultMissingSeverity =
      rulesDefaults.defaultMissingSeverity || "high";

    const riskScore = typeof ai.riskScore === "number" ? ai.riskScore : 80;

    // OPTIONAL: Persist org defaults
    await sql`
      UPDATE organizations
      SET
        industry = ${industry},
        hq_location = ${hqLocation || null},
        vendor_count = ${vendorCount || null},
        strictness = ${strictness},
        expiration_warning_days = ${expirationWarningDays},
        default_missing_severity = ${defaultMissingSeverity},
        risk_score = ${riskScore}
      WHERE id = ${orgId};
    `;

    return res.status(200).json({
      ok: true,
      ai: {
        coverages: ai.coverages || [],
        rulesDefaults: {
          strictness,
          expirationWarningDays,
          defaultMissingSeverity,
        },
        riskScore,
        teamSuggestions: ai.teamSuggestions || [],
        teamRoles: ai.teamRoles || {},
        teamNotes: ai.teamNotes || "",
      },
    });
  } catch (err) {
    console.error("[org-intel] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
