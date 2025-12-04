// pages/api/onboarding/ai/org-intel.js
// AI Organization Intelligence for Onboarding Wizard (NOW WITH vendorSuggestion)
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

    const cleanCompany =
      companyName.toLowerCase().replace(/[^a-z0-9]/g, "") || "company";

    /* ==========================================================
       AI PROMPT — includes vendorSuggestion block
    ========================================================== */
    const prompt = `
You are an expert in vendor insurance, compliance, and onboarding.

Generate:

1. Recommended coverages + endorsement bundles
2. Default rule strictness + expiration window
3. Organization risk score
4. Internal team suggestion emails
5. FIRST vendor suggestion (VERY important)

Organization:
- Name: ${companyName}
- Industry: ${industry}
- HQ: ${hqLocation || "Unknown"}
- Vendor Count: ${vendorCount || "Unknown"}

Pick a realistic FIRST vendor based on industry:
Examples:
- Construction → Roofing, Electrical, HVAC, Framing
- Property Management → Janitorial, Security, Landscaping
- Manufacturing → Industrial Supply, Machine Repair
- Hospitality → Cleaning, Security, Kitchen Maintenance

Return STRICT JSON ONLY:

{
  "coverages": [
    {
      "name": "General Liability",
      "required": true,
      "recommendedLimitEachOccurrence": 1000000,
      "recommendedAggregate": 2000000,
      "endorsements": ["Additional Insured","Primary & Non-Contributory","Waiver of Subrogation"]
    }
  ],

  "rulesDefaults": {
    "strictness": "lenient | balanced | strict",
    "expirationWarningDays": 30,
    "defaultMissingSeverity": "low | medium | high"
  },

  "riskScore": 0-100,

  "teamSuggestions": [
    "risk.manager@${cleanCompany}.com",
    "ops.director@${cleanCompany}.com"
  ],

  "teamRoles": {
    "risk.manager": "Oversees compliance, renewals, and rule calibration.",
    "ops.director": "Handles day-to-day vendor operations and exception approvals."
  },

  "teamNotes": "Roles recommended based on typical risk & compliance structure.",

  "vendorSuggestion": {
    "name": "Sample Vendor LLC",
    "email": "owner@samplevendor.com",
    "type": "Roofing",
    "notes": "Chosen as a typical high-risk vendor category for this industry."
  }
}

STRICT JSON ONLY.
    `;

    /* ==========================================================
       AI CALL
    ========================================================== */
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.25,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content || "{}";

    let ai;
    try {
      // Strip extra text and isolate JSON
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}") + 1;
      ai = JSON.parse(text.slice(start, end));
    } catch (err) {
      console.error("[org-intel] JSON parse error:", err, text);
      return res.status(500).json({ ok: false, error: "AI JSON parse error" });
    }

    /* ==========================================================
       SANITIZE + DEFAULTS
    ========================================================== */
    const rulesDefaults = ai.rulesDefaults || {};

    const strictness = rulesDefaults.strictness || "balanced";
    const expirationWarningDays = rulesDefaults.expirationWarningDays || 30;
    const defaultMissingSeverity =
      rulesDefaults.defaultMissingSeverity || "high";

    const riskScore = typeof ai.riskScore === "number" ? ai.riskScore : 80;

    // Vendor suggestion block
    const vendorSuggestion = ai.vendorSuggestion || {
      name: "Example Vendor LLC",
      email: "owner@examplevendor.com",
      type: "General Contractor",
      notes: "AI fallback example vendor.",
    };

    /* ==========================================================
       UPDATE ORG RECORD (optional but useful)
    ========================================================== */
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

    /* ==========================================================
       RETURN AI PACKAGE
    ========================================================== */
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
        vendorSuggestion: {
          name: vendorSuggestion.name,
          email: vendorSuggestion.email,
          type: vendorSuggestion.type,
          notes: vendorSuggestion.notes,
        },
      },
    });
  } catch (err) {
    console.error("[org-intel] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
