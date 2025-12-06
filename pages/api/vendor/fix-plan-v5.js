// pages/api/vendor/fix-plan-v5.js
// ============================================================
// AI FIX PLAN GENERATOR — V5 RULE ENGINE
//
// POST /api/vendor/fix-plan-v5
// Body: { vendorId, orgId }
//
// Does:
// 1) Load failing rule_results_v3 for vendor/org
// 2) Join with requirements_rules_v2 for context
// 3) Ask OpenAI to generate a structured "fix plan"
// 4) Return sections you can show in UI or email / PDF
// ============================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { vendorId, orgId } = req.body || {};

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId.",
      });
    }

    // ---------------------------------------------------
    // 1) Load failing rule_results_v3 for this vendor/org
    // ---------------------------------------------------
    const failingRows = await sql`
      SELECT
        rr.requirement_id AS rule_id,
        rr.severity,
        rr.message,
        r.field_key,
        r.operator,
        r.expected_value,
        r.requirement_text,
        r.group_id
      FROM rule_results_v3 rr
      LEFT JOIN requirements_rules_v2 r
        ON r.id = rr.requirement_id
      WHERE rr.org_id = ${orgId}
        AND rr.vendor_id = ${vendorId}
        AND rr.passed = FALSE
      ORDER BY rr.severity DESC, rr.requirement_id ASC;
    `;

    if (!failingRows.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        hasFailures: false,
        plan: null,
        message: "No failing rules for this vendor. No fix plan needed.",
      });
    }

    // ---------------------------------------------------
    // 2) Load vendor + basic policy info for context
    // ---------------------------------------------------
    const [vendorRow] = await sql`
      SELECT id, vendor_name, email, category
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;

    const policies = await sql`
      SELECT
        id,
        coverage_type,
        policy_number,
        carrier,
        expiration_date,
        limit_each_occurrence
      FROM policies
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    // ---------------------------------------------------
    // 3) Build OpenAI prompt
    // ---------------------------------------------------
    const failuresForAi = failingRows.map((f) => ({
      rule_id: f.rule_id,
      severity: f.severity,
      field_key: f.field_key,
      operator: f.operator,
      expected_value: f.expected_value,
      requirement_text: f.requirement_text,
      engine_message: f.message,
    }));

    const prompt = `
You are an expert commercial insurance compliance consultant.

You are analyzing failing rule checks for a VENDOR against an organization's insurance requirements.

### Vendor:
${JSON.stringify(vendorRow || {}, null, 2)}

### Failing Rules (V5):
${JSON.stringify(failuresForAi, null, 2)}

### Vendor Policies:
${JSON.stringify(policies || [], null, 2)}

Your job:
- Create a CLEAR, ACTIONABLE FIX PLAN for this vendor's insurance broker and the vendor.
- Group fixes by coverage type.
- For each failing rule, explain:
  - What is wrong (plain English).
  - What the required fix is (limit or coverage details).
  - Whether it's urgent or can wait until renewal.
- Suggest specific policy changes or endorsements if relevant.
- If multiple rules relate to the same coverage, consolidate them.

Respond ONLY with **valid JSON**, with this shape:

{
  "summary": "High level plain-language summary of what needs fixing overall.",
  "sections": [
    {
      "coverageType": "General Liability",
      "priority": "critical | high | medium | low",
      "issues": [
        {
          "ruleId": 123,
          "severity": "critical",
          "description": "Plain explanation of the issue.",
          "requiredChange": "What the broker must change in the policy.",
          "notesForVendor": "Friendly guidance for the vendor.",
          "notesForBroker": "More technical instructions for the broker."
        }
      ]
    }
  ],
  "emailSubject": "Suggested COI Fixes for Your Insurance Policies",
  "emailBodyForVendor": "Short email body we can send to the vendor explaining what needs to be done.",
  "emailBodyForBroker": "Short email body we can send to the broker with more technical detail."
}
`;

    // ---------------------------------------------------
    // 4) Call OpenAI
    // ---------------------------------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You write clear, practical insurance compliance fix plans.",
        },
        { role: "user", content: prompt },
      ],
    });

    let content = completion.choices?.[0]?.message?.content?.trim() || "";

    if (!content) {
      return res.status(500).json({
        ok: false,
        error: "AI returned an empty response.",
      });
    }

    // Strip markdown fences if they exist
    if (content.startsWith("```")) {
      content = content.replace(/```json|```/g, "").trim();
    }

    let plan;
    try {
      plan = JSON.parse(content);
    } catch (err) {
      console.error("[fix-plan-v5] JSON parse error:", err, "content:", content);
      return res.status(500).json({
        ok: false,
        error: "AI returned invalid JSON.",
        raw: content.slice(0, 500),
      });
    }

    // ---------------------------------------------------
    // 5) Return plan
    // ---------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      hasFailures: true,
      plan,
      failingRules: failuresForAi,
    });
  } catch (err) {
    console.error("[fix-plan-v5 ERROR]:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Fix plan generation failed.",
    });
  }
}
