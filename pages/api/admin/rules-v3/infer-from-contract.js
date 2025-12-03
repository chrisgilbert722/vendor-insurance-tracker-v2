// pages/api/admin/rules-v3/infer-from-contract.js
//
// Contract → Rule Inference Engine
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
      return res
        .status(400)
        .json({ ok: false, error: "Missing documentId" });
    }

    // 1) Load contract doc from vendor_documents
    const docs = await sql`
      SELECT id, vendor_id, org_id, doc_type, ai_json
      FROM vendor_documents
      WHERE id = ${documentId}
      LIMIT 1;
    `;

    if (!docs.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Document not found" });
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
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId (in body or document)" });
    }

    const ai = doc.ai_json || {};
    const insuranceClause =
      ai.insurance_clause ||
      ai.insuranceClause ||
      ai.insuranceSection ||
      ai.summary ||
      "";

    if (!insuranceClause || insuranceClause.trim().length < 20) {
      return res.status(400).json({
        ok: false,
        error:
          "Contract AI extraction has no usable insurance clause or summary.",
      });
    }

    // 2) Build prompt for OpenAI
    const systemPrompt = `
You are an expert insurance compliance analyst.
You will convert contract insurance requirements into a set of structured rules.

You MUST respond with pure JSON only, no commentary.

Each rule must be of the form:
{
  "type": "coverage" | "limit" | "endorsement" | "date",
  "field": "gl_limit" | "auto_limit" | "umbrella_limit" | "wc_employer_liability" | "endorsements" | "expiration_date" | "<custom_field>",
  "condition": "exists" | "missing" | "gte" | "lte" | "requires" | "before" | "after",
  "value": "<value or null>",
  "message": "<human readable message for vendor/admin>",
  "severity": "low" | "medium" | "high" | "critical"
}

- For minimum coverage limits, use type="limit" and condition="gte".
- For required endorsements, use type="endorsement" and condition="requires", with value like "CG2010", "CG2037", "WOS", "PNC".
- For required presence of a coverage, use type="coverage" and condition="exists", value=null.
- For missing coverage that must NOT be present, use condition="missing".
- For expiration requirements (e.g., policy must not expire before job completion), use type="date" on "expiration_date" with "after" or "before".
`;

    const userPrompt = `
Here is the contract's insurance language:

---
${insuranceClause}
---

Please return a JSON array of rules, without backticks or any other text. Example:

[
  {
    "type": "limit",
    "field": "gl_limit",
    "condition": "gte",
    "value": "1000000",
    "message": "General Liability limit must be at least $1,000,000.",
    "severity": "high"
  }
]
`;

    // 3) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.15,
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    let inferredRules = [];

    try {
      // Ensure we strip any weird markdown fences just in case
      const trimmed = raw.trim().replace(/```json/gi, "").replace(/```/g, "");
      inferredRules = JSON.parse(trimmed);
    } catch (parseErr) {
      console.error("[infer-from-contract] JSON parse error", parseErr, raw);
      return res.status(500).json({
        ok: false,
        error: "Failed to parse AI response as JSON.",
        raw,
      });
    }

    if (!Array.isArray(inferredRules) || !inferredRules.length) {
      return res.status(400).json({
        ok: false,
        error: "AI did not return any rules.",
        raw,
      });
    }

    // 4) Create a new rule group for these contract rules
    const label =
      groupLabel ||
      `Contract: ${documentId} insurance rules`.slice(0, 120);

    const description =
      "Rules inferred from contract insurance clause.";

    const groupRows = await sql`
      INSERT INTO rule_groups (org_id, label, description, severity, active)
      VALUES (${orgId}, ${label}, ${description}, 'high', TRUE)
      RETURNING id, org_id, label, description, severity, active, created_at;
    `;

    const group = groupRows[0];

    // 5) Insert rules into rules_v3
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

      const value = r.value !== undefined ? String(r.value) : null;

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
