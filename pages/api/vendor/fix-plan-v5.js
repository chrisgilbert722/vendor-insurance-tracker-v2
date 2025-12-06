// pages/api/vendor/fix-plan-v5.js
// ============================================================
// FIX PLAN V5 — AI-Powered Rule-Based Vendor Remediation Engine
// ============================================================
// Inputs:
//   vendorId, orgId
// Logic:
//   1. Run Rule Engine V5 (via /engine/run-v3)
//   2. Extract failing rules, grouped by severity
//   3. Convert each failing rule → actionable remediation step
//   4. Generate:
//        • steps[]
//        • vendorEmailSubject
//        • vendorEmailBody
//        • internalNotes
// Output:
//   Clean JSON for Fix Cockpit V5
// ============================================================

import { sql } from "../../../lib/db";
import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { vendorId, orgId } = req.query;

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
    // 2) Run Rule Engine V5 (same endpoint, upgraded logic)
    // ------------------------------------------------------------
    const engineRes = await fetch(
      `${process.env.APP_URL}/api/engine/run-v3`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          orgId,
          dryRun: true,
        }),
      }
    );

    const engineJson = await engineRes.json();
    if (!engineJson.ok) {
      return res.status(200).json({
        ok: false,
        error: engineJson.error || "Engine failed.",
      });
    }

    const failingRules = engineJson.failingRules || [];

    // If nothing failed = compliant
    if (failingRules.length === 0) {
      return res.status(200).json({
        ok: true,
        steps: ["No action required — vendor appears compliant."],
        vendorEmailSubject: `Your COI Review — No Issues Found`,
        vendorEmailBody: `Hi ${vendor.name},

We reviewed your Certificate of Insurance and found no outstanding issues.

Thank you for maintaining compliance.

– Compliance Team`,
        internalNotes: "Vendor fully compliant — no further review required.",
      });
    }

    // ------------------------------------------------------------
    // 3) Build human-readable rule summaries for AI
    // ------------------------------------------------------------
    const ruleSummaries = failingRules.map((r) => {
      return {
        ruleId: r.ruleId,
        severity: r.severity || "medium",
        field: r.fieldKey,
        operator: r.operator,
        expected: r.expectedValue,
        message: r.message,
      };
    });

    // ------------------------------------------------------------
    // 4) Call AI to convert rules → Fix Steps
    // ------------------------------------------------------------
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are an insurance compliance expert.

Convert the failing V5 rules below into a clear remediation plan for the vendor.
Each rule should produce:
- A single clear fix step
- Broker-friendly language
- Precise instructions
- No legal jargon
- No unnecessary details

Failing Rules (JSON):
${JSON.stringify(ruleSummaries, null, 2)}

Policies (JSON):
${JSON.stringify(policies, null, 2)}

Return response ONLY as valid JSON:
{
  "steps": ["...", "..."],
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

    let content =
      aiRes.choices?.[0]?.message?.content?.trim() || "{}";

    // Strip code fences if returned
    if (content.startsWith("```")) {
      content = content.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      parsed = {
        steps: ["AI returned unreadable data. Retry fix-plan."],
        vendorSubject: "COI Issues Detected — Action Required",
        vendorBody:
          "We identified COI issues but AI explanation failed. Please re-run fix plan.",
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
      error: err.message || "Fix-plan V5 failed.",
    });
  }
}
