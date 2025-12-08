// pages/api/vendor/fix-plan.js
// ============================================================
// FIX PLAN V5 — AI-Powered Rule-Based Vendor Remediation Engine
// ============================================================

import { sql } from "../../../lib/db";
import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const vendorId = Number(req.query.vendorId);
    const orgId = Number(req.query.orgId);

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId",
      });
    }

    // ------------------------------------------------------------
    // 1) Load vendor + policies
    // ------------------------------------------------------------
    const vendorRows = await sql`
      SELECT id, name, email
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;
    if (!vendorRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found.",
      });
    }

    const vendor = vendorRows[0];

    const policies = await sql`
      SELECT *
      FROM policies
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    // ------------------------------------------------------------
    // 2) Run Rule Engine V5 (dry run)
    // ------------------------------------------------------------
    const engineRes = await fetch(
      `${process.env.APP_URL}/api/engine/run-v3`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          orgId,
          dryRun: true
        }),
      }
    );

    let engineJson;
    try {
      engineJson = await engineRes.json();
    } catch (e) {
      return res.status(200).json({
        ok: false,
        error: "Rule engine returned invalid JSON.",
      });
    }

    if (!engineJson.ok) {
      return res.status(200).json({
        ok: false,
        error: engineJson.error || "Engine failed.",
      });
    }

    const failingRules = engineJson.failingRules || [];

    // ------------------------------------------------------------
    // 2b) No failing rules = vendor is compliant
    // ------------------------------------------------------------
    if (failingRules.length === 0) {
      return res.status(200).json({
        ok: true,
        steps: ["No action required — vendor appears compliant."],
        vendorEmailSubject: `Your COI Review — No Issues Found`,
        vendorEmailBody: `Hi ${vendor.name},

We reviewed your Certificate of Insurance and found no outstanding issues.

Thank you for maintaining compliance.

– Compliance Team`,
        internalNotes: "Vendor fully compliant — no further review required."
      });
    }

    // ------------------------------------------------------------
    // 3) Summaries for AI
    // ------------------------------------------------------------
    const ruleSummaries = failingRules.map((r) => ({
      ruleId: r.ruleId,
      severity: r.severity || "medium",
      field: r.fieldKey,
      operator: r.operator,
      expected: r.expectedValue,
      message: r.message,
    }));

    // ------------------------------------------------------------
    // 4) AI Fix Plan
    // ------------------------------------------------------------
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an insurance compliance expert.

Convert these failing rules into a remediation plan for the vendor.

Failing Rules:
${JSON.stringify(ruleSummaries, null, 2)}

Policies:
${JSON.stringify(policies, null, 2)}

Return ONLY valid JSON in this exact shape:

{
  "steps": ["..."],
  "vendorSubject": "...",
  "vendorBody": "...",
  "internalNotes": "..."
}
`;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    let content = aiRes.choices?.[0]?.message?.content?.trim() || "{}";

    if (content.startsWith("```")) {
      content = content.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      parsed = {
        steps: ["AI failed to generate steps. Retry."],
        vendorSubject: "COI Issues",
        vendorBody: "There are issues with your COI.",
        internalNotes: content.substring(0, 500),
      };
    }

    return res.status(200).json({
      ok: true,
      steps: parsed.steps || [],
      vendorEmailSubject: parsed.vendorSubject || "",
      vendorEmailBody: parsed.vendorBody || "",
      internalNotes: parsed.internalNotes || "",
    });

  } catch (err) {
    return res.status(200).json({
      ok: false,
      error: err.message || "Fix-plan failed.",
    });
  }
}
