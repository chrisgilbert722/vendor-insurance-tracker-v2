// lib/onboardingAiBrain.js
// AI Onboarding Wizard Brain — handles ANY messy CSV and returns structured onboarding data

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * analyzeVendorCsv
 *
 * Input:
 *  - orgId: string (for later use, not required by AI)
 *  - csvText: raw CSV text (ANY shape, ANY headers)
 *
 * Output (shape we control + can evolve):
 * {
 *   columns: {
 *     raw_headers: [...string],
 *     detected_roles: {
 *       vendor_name: "Vendor Name",
 *       vendor_email: "Email",
 *       broker_email: "Broker Email",
 *       policy_types: ["GL", "Workers Comp", ...],
 *       expiration_columns: ["GL Exp", "WC Exp", ...],
 *       risk_column: "Risk Tier",
 *       industry_column: "Industry",
 *       address_column: "Address",
 *       unknown_or_notes: ["Notes", "Misc", ...]
 *     }
 *   },
 *   vendors: [
 *     {
 *       row_index: 2,
 *       name: "Acme Concrete LLC",
 *       email: "ops@acmeconcrete.com",
 *       brokerEmail: "jane.broker@bigbroker.com",
 *       riskTier: "high" | "medium" | "low" | null,
 *       industry: "Construction",
 *       address: "123 Main St, Dallas TX",
 *       policies: [
 *         {
 *           policyType: "General Liability",
 *           coverageCode: "GL",
 *           hasPolicy: true,
 *           expirationDate: "2025-03-01",
 *           sourceColumn: "GL Exp",
 *           rawValue: "3/1/25"
 *         },
 *         // ...
 *       ],
 *       notes: "Free-form AI summary if needed"
 *     }
 *   ],
 *   requirements: [
 *     {
 *       coverageCode: "GL",
 *       label: "General Liability",
 *       minLimits: "1M/2M",
 *       requiredFor: "all_vendors" | "high_risk_only" | "specific_industry",
 *       industries: ["Construction", "HVAC"],
 *       notes: "AI-inferred from columns and patterns"
 *     }
 *   ],
 *   missingDocuments: [
 *     {
 *       vendorName: "Acme Concrete LLC",
 *       vendorEmail: "ops@acmeconcrete.com",
 *       coverageCode: "GL",
 *       reason: "No expiration date or policy flag present",
 *       severity: "high" | "medium" | "low"
 *     }
 *   ],
 *   confidenceWarnings: [
 *     "Column 'ABC123' could not be interpreted",
 *     "Some vendors missing email address"
 *   ]
 * }
 */

function buildOnboardingPrompt(csvText) {
  return `
You are an expert insurance compliance analyst and data modeler.

You will receive a raw CSV dump of vendor-related data. The CSV may be:
- messy
- have inconsistent headers
- have extra columns
- have unknown or cryptic header names
- have multiple expiration columns
- mix policy, risk, and contact info

Your job is to:
1) Infer what each column likely represents.
2) Extract a normalized view of vendors, their policies, expirations, risk tiers, and contact data.
3) Infer high-level "requirements" based on the pattern of columns (e.g., GL, Workers Comp, Auto, Umbrella).
4) Identify missing or incomplete data that will require document uploads or vendor outreach.
5) Return STRICT JSON in the exact format described below.

Rules:
- Do NOT invent vendors that are not present.
- If data is missing, use null instead of guessing wildly.
- If you are unsure about a column, put it in columns.detected_roles.unknown_or_notes.
- For dates, try to convert to ISO YYYY-MM-DD if possible; if impossible, use null and keep the rawValue.

CSV DATA (RAW):
----------------
${csvText}
----------------

You MUST respond with JSON ONLY, in this shape:

{
  "columns": {
    "raw_headers": [ "string", ... ],
    "detected_roles": {
      "vendor_name": "string or null",
      "vendor_email": "string or null",
      "broker_email": "string or null",
      "policy_types": [ "string", ... ],
      "expiration_columns": [ "string", ... ],
      "risk_column": "string or null",
      "industry_column": "string or null",
      "address_column": "string or null",
      "unknown_or_notes": [ "string", ... ]
    }
  },
  "vendors": [
    {
      "row_index": 2,
      "name": "Acme Concrete LLC",
      "email": "ops@acmeconcrete.com",
      "brokerEmail": "jane.broker@bigbroker.com",
      "riskTier": "high",
      "industry": "Construction",
      "address": "123 Main St, Dallas TX",
      "policies": [
        {
          "policyType": "General Liability",
          "coverageCode": "GL",
          "hasPolicy": true,
          "expirationDate": "2025-03-01",
          "sourceColumn": "GL Exp",
          "rawValue": "3/1/25"
        }
      ],
      "notes": "Short AI note about this vendor if helpful."
    }
  ],
  "requirements": [
    {
      "coverageCode": "GL",
      "label": "General Liability",
      "minLimits": "1M/2M",
      "requiredFor": "all_vendors",
      "industries": [],
      "notes": "Explain briefly why this requirement exists (inferred from CSV)."
    }
  ],
  "missingDocuments": [
    {
      "vendorName": "Acme Concrete LLC",
      "vendorEmail": "ops@acmeconcrete.com",
      "coverageCode": "GL",
      "reason": "No expiration date or policy data present.",
      "severity": "high"
    }
  ],
  "confidenceWarnings": [
    "Short note about any ambiguity or questionable mapping."
  ]
}
`;
}

export async function analyzeVendorCsv({ orgId, csvText }) {
  const prompt = buildOnboardingPrompt(csvText);

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const text = res.choices?.[0]?.message?.content || "";

  // Attempt robust JSON extraction from the model output
  let jsonString = text.trim();

  // If model accidentally wraps JSON in markdown, strip it
  if (jsonString.startsWith("```")) {
    jsonString = jsonString.replace(/```json/gi, "").replace(/```/g, "").trim();
  }

  try {
    const parsed = JSON.parse(
      jsonString.slice(jsonString.indexOf("{"), jsonString.lastIndexOf("}") + 1)
    );

    return {
      ok: true,
      orgId,
      payload: parsed,
      raw: text,
    };
  } catch (err) {
    return {
      ok: false,
      orgId,
      error: "Failed to parse AI onboarding JSON",
      raw: text,
      parseError: err.message,
    };
  }
}
