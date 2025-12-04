// pages/api/admin/rules-v3/infer-from-contract.js
//
// Contract → Rule Inference Engine (V3)
// Reads vendor_documents (doc_type = 'contract'),
// sends insurance clause to OpenAI, and creates
// rule_groups + rules_v3 for the org.
//

import { sql } from "../../../../lib/db";
import { openai } from "../../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { documentId, orgId: orgIdBody, groupLabel } = req.body;

    if (!documentId) {
      return res.status(400).json({
        ok: false,
        error: "Missing documentId",
      });
    }

    /* --------------------------------------------------------
       1) Load contract document from vendor_documents
    -------------------------------------------------------- */
    const docs = await sql`
      SELECT id, vendor_id, org_id, doc_type, ai_json, filename
      FROM vendor_documents
      WHERE id = ${documentId}
      LIMIT 1;
    `;

    if (!docs.length) {
      return res.status(404).json({
        ok: false,
        error: "Document not found",
      });
    }

    const doc = docs[0];

    if (doc.doc_type !== "contract") {
      return res.status(400).json({
        ok: false,
        error: `Document ${documentId} is not a contract (doc_type = ${doc.doc_type})`,
      });
    }

    const orgId = orgIdBody || doc.org_id;

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId (in body or document)",
      });
    }

    const ai = doc.ai_json || {};

    // Extract clause or fallback to summary text
    const insuranceClause =
      ai.insurance_clause ||
      ai.insuranceClause ||
      ai.insuranceSection ||
      ai.summary ||
      ai.text ||
      "";

    if (!insuranceClause || insuranceClause.trim().length < 20) {
      return res.status(400).json({
        ok: false,
        error:
          "No usable insurance clause found in contract's AI extraction.",
      });
    }

    /* --------------------------------------------------------
       2) Build prompt for OpenAI
    -------------------------------------------------------- */
    const systemPrompt = `
You are an elite insurance compliance analyst.
Convert the contract’s insurance requirements into structured rules for an automated rule engine.

You MUST respond with pure JSON only (an array), no commentary.

Valid rule object format:
{
  "type": "coverage" | "limit" | "endorsement" | "date",
  "field": "gl_limit" | "auto_limit" | "umbrella_limit" | "wc_employer_liability" | "endorsements" | "expiration_date" | "<custom_field>",
  "condition": "exists" | "missing" | "gte" | "lte" | "requires" | "before" | "after",
  "value": "<number|string|null>",
  "message": "Readable explanation for vendors/admins.",
  "severity": "low" | "medium" | "high" | "critical"
}

RULE MAPPING GUIDANCE:
- General Liability → gl_limit
- Auto Liability → auto_limit
- Umbrella / Excess → umbrella_limit
- Workers Compensation → wc_employer_liability
- Endorsements → endorsements (value must be endorsement code, e.g. "CG2010")

MINIMUM LIMITS:
- If contract requires a minimum limit, use:
  type="limit", condition="gte", value="<number>"

ENDORSEMENTS:
- Additional Insured → "CG2010" or "CG2037"
- Waiver of Subrogation → "WOS"
- Primary & Noncontributory → "PNC"

COVERAGE REQUIREMENTS:
- If the contract says coverage MUST exist:
  type="coverage", condition="exists"

DATE REQUIREMENTS:
- If policy must not expire before project completion:
  type="date", field="expiration_date", condition="after", value="<date>"
`;

    const userPrompt = `
Contract Insurance Language:

---
${insuranceClause}
---

Return ONLY JSON, no commentary, no backticks.
Example output:

[
  {
    "type": "limit",
    "field": "gl_limit",
    "condition": "gte",
    "value": "1000000",
    "message": "General Liability must be at least $1M.",
    "severity": "high"
  }
]
`;

    /* --------------------------------------------------------
       3) Call OpenAI
    -------------------------------------------------------- */
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 1200,
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    let inferredRules = [];

    try {
      const cleaned = raw.trim().replace(/```json/gi, "").replace(/```/g, "");
      inferredRules = JSON.parse(cleaned);
    } catch (err) {
      console.error("[infer-from-contract] JSON parse error", err, raw);
      return res.status(500).json({
        ok: false,
        error: "Could not parse JSON from OpenAI.",
        raw,
      });
    }

    if (!Array.isArray(inferredRules) || inferredRules.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "OpenAI returned no rules.",
        raw,
      });
    }

    /* --------------------------------------------------------
       4) Create Rule Group
    -------------------------------------------------------- */
    const label =
      groupLabel ||
      `Contract Rules: ${doc.filename || "Contract"} (${documentId})`.slice(
        0,
        120
      );

    const description = "Rules inferred automatically from contract insurance requirements.";

    const groupRows = await sql`
      INSERT INTO rule_groups (org_id, label, description, severity, active)
      VALUES (${orgId}, ${label}, ${description}, 'high', TRUE)
      RETURNING id, org_id, label, description, severity, active, created_at;
    `;

    const group = groupRows[0];

    /* --------------------------------------------------------
       5) Insert Rules
    -------------------------------------------------------- */
    const allowedTypes = ["coverage", "limit", "endorsement", "date"];
    const allowedConditions = [
      "exists",
      "missing",
      "gte",
      "lte",
      "requires",
      "before",
      "after",
    ];
    const allowedSeverities = ["low", "medium", "high", "critical"];

    const createdRules = [];

    for (const r of inferredRules) {
      if (!r || typeof r !== "object") continue;
      if (!r.field || !r.message) continue;

      const type = allowedTypes.includes(r.type) ? r.type : "limit";
      const condition = allowedConditions.includes(r.condition)
        ? r.condition
        : type === "coverage"
        ? "exists"
        : type === "limit"
        ? "gte"
        : "requires";

      const severity = allowedSeverities.includes(r.severity)
        ? r.severity
        : "high";

      const value =
        r.value !== undefined && r.value !== null
          ? String(r.value)
          : null;

      const rows = await sql`
        INSERT INTO rules_v3 (group_id, type, field, condition, value, message, severity, active)
        VALUES (
          ${group.id},
          ${type},
          ${r.field},
          ${condition},
          ${value},
          ${r.message},
          ${severity},
          TRUE
        )
        RETURNING id, group_id, type, field, condition, value, message, severity, active;
      `;

      createdRules.push(rows[0]);
    }

    /* --------------------------------------------------------
       6) Return result
    -------------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      group,
      rulesCreated: createdRules.length,
      rules: createdRules,
    });
  } catch (err) {
    console.error("[infer-from-contract] ERROR", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Contract rule inference failed.",
    });
  }
}
