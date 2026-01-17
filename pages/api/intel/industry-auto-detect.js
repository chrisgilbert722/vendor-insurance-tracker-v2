// pages/api/intel/industry-auto-detect.js
// GOD MODE — AI Industry Auto-Detection (V1)
// Reads vendor/policy/rule/org data → Uses OpenAI → Detects industry → Saves to org table.

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
    const { orgId } = req.body || {};

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId in request body.",
      });
    }

    // ============================================================
    // LOAD CONTEXT DATA FOR INDUSTRY DETECTION
    // ============================================================

    // Vendors
    let vendors = [];
    try {
      vendors = await sql`
        SELECT name AS vendor_name
        FROM vendors
        WHERE org_id = ${orgId}
        LIMIT 50
      `;
    } catch (err) {
      console.warn("[IndustryDetect] Could not load vendors:", err);
    }

    // Policies
    let policies = [];
    try {
      policies = await sql`
        SELECT
          coverage_type,
          expiration_date,
          limit_each_occurrence,
          auto_limit,
          work_comp_limit,
          umbrella_limit
        FROM policies
        WHERE vendor_id IN (
          SELECT id FROM vendors WHERE org_id = ${orgId}
        )
        LIMIT 50
      `;
    } catch (err) {
      console.warn("[IndustryDetect] Could not load policies:", err);
    }

    // Rule Groups
    let ruleGroups = [];
    try {
      ruleGroups = await sql`
        SELECT label, description, severity
        FROM rule_groups
        WHERE org_id = ${orgId}
        LIMIT 20
      `;
    } catch (err) {
      console.warn("[IndustryDetect] Could not load rule groups:", err);
    }

    // Wizard activity or onboarding hints could be added later

    const systemPrompt = `
You are an expert insurance industry classification AI.

You analyze:
- vendor list (names + categories)
- COI policy types and limits
- rule groups (if any exist)
- general risk patterns

Your job:
1. Detect the org's most likely industry.
2. Output a confidence score (0.0–1.0).
3. Explain why (brief explanation).
4. Recommend:
   - default rule preset (construction, healthcare, retail, staffing, manufacturing, property management, etc.)
   - template tone and risk language
5. DO NOT return a list of possible industries — pick the single most likely one.

Return pure JSON in the exact structure instructed.
`;

    const userPrompt = `
Analyze the following org data:

Vendors:
${JSON.stringify(vendors, null, 2)}

Policies:
${JSON.stringify(policies, null, 2)}

Rule Groups:
${JSON.stringify(ruleGroups, null, 2)}

Return ONLY valid JSON, in this exact shape:

{
  "industry": "string",
  "confidence": 0.0,
  "reasoning": "string",
  "recommendedRuleset": "string",
  "recommendedTemplateTone": "string"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0].message.content || "";

    let result;
    try {
      result = JSON.parse(raw);
    } catch (err) {
      console.error("[IndustryDetect JSON ERROR]", err, raw);
      return res.status(200).json({
        ok: false,
        error: "Model did not return valid JSON.",
        raw,
      });
    }

    // Basic validation
    if (!result.industry || typeof result.confidence !== "number") {
      return res.status(200).json({
        ok: false,
        error: "Industry detection result missing required fields.",
        result,
      });
    }

    // ============================================================
    // SAVE INDUSTRY TO ORG RECORD
    // ============================================================
    try {
      await sql`
        UPDATE orgs
        SET industry = ${result.industry}
        WHERE id = ${orgId}
      `;
    } catch (err) {
      console.error("[IndustryDetect SAVE ERROR]", err);
      return res.status(200).json({
        ok: false,
        error: "Failed to update industry on org record.",
        result,
      });
    }

    return res.status(200).json({
      ok: true,
      message: `Industry detected and saved successfully.`,
      detected: result,
    });
  } catch (err) {
    console.error("[AI Industry Auto-Detect ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "Industry auto-detection failed.",
      details: err.message,
    });
  }
}
