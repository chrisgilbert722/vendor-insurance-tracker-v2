// pages/api/ai/broker-coi-check.js
// UACC — Broker COI Auto-Checker
// Reads latest COI analysis + failing rules + alerts
// and tells the broker EXACTLY what to fix.

import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  try {
    const { orgId, vendorId, policyId } = req.body;

    if (!orgId || !vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or vendorId.",
      });
    }

    // ==========================================
    // 1. Load latest COI document memory (from copilot_memory)
    // ==========================================
    const docMem = await sql`
      SELECT memory
      FROM copilot_memory
      WHERE org_id = ${orgId}
        AND role = 'document'
        AND (vendor_id = ${vendorId} OR vendor_id IS NULL)
        AND (policy_id = ${policyId} OR policy_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const docMemory = docMem[0]?.memory || null;
    const extracted = docMemory?.extracted || null;

    if (!extracted) {
      return res.status(200).json({
        ok: false,
        error:
          "No analyzed COI/document found for this vendor/policy. Upload a document via Copilot first.",
      });
    }

    // ==========================================
    // 2. Load failing rules from vendor_compliance_cache
    // ==========================================
    const compRows = await sql`
      SELECT failing, passing, status, summary
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
      LIMIT 1;
    `;

    const compliance = compRows[0] || null;
    const failingRules = compliance?.failing || [];
    const complianceStatus = compliance?.status || "unknown";
    const complianceSummary = compliance?.summary || "";

    // ==========================================
    // 3. Load alerts related to this vendor/policy
    // ==========================================
    const alerts = await sql`
      SELECT *
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 20;
    `;

    // ==========================================
    // 4. Load policy & vendor for more context
    // ==========================================
    let policy = null;
    if (policyId) {
      const p = await sql`
        SELECT *
        FROM policies
        WHERE id = ${policyId}
        LIMIT 1;
      `;
      policy = p[0] || null;
    }

    const vRows = await sql`
      SELECT *
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;
    const vendor = vRows[0] || null;

    // ==========================================
    // 5. Build AI Prompt for Broker COI Check
    // ==========================================
    const systemPrompt = `
You are "Broker COI Auto-Checker", an AI assistant for INSURANCE BROKERS.

You are given:
- Extracted COI / insurance document data
- Failing rules from a compliance rule engine
- Alerts related to this vendor/policy
- Vendor & policy context

Your job:
1. Explain the COI's current state.
2. Identify EXACTLY what is wrong from a compliance perspective.
3. Map failing rules to specific fixes a broker can make (e.g. add endorsement CG 20 10, increase GL Each Occurrence to 1M, add Waiver of Subrogation, add Additional Insured, etc.).
4. Provide a bullet list of "Issues" and "Fixes".
5. Generate a sample email the broker can send to their underwriter or internal team to request corrections.
6. Be precise but not over-technical. Use normal insurance language a broker understands.
7. If something is unclear from the data, say so and recommend what to verify.

Return JSON with this exact shape:

{
  "summary": "...",
  "issues": [
    {
      "title": "...",
      "detail": "...",
      "rule_reference": "field_key/operator/expected/actual if available"
    }
  ],
  "fixes": [
    {
      "title": "...",
      "instructions": "..."
    }
  ],
  "sample_email": "..."
}

Then after the JSON, include a human-readable explanation.
`;

    const userPrompt = `
VENDOR CONTEXT:
${JSON.stringify(vendor, null, 2)}

POLICY CONTEXT:
${JSON.stringify(policy, null, 2)}

EXTRACTED DOCUMENT:
${JSON.stringify(extracted, null, 2)}

COMPLIANCE STATUS:
${JSON.stringify(
      {
        status: complianceStatus,
        summary: complianceSummary,
        failingRules,
      },
      null,
      2
    )}

ALERTS:
${JSON.stringify(alerts, null, 2)}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });

    const text = completion.choices[0].message.content || "";

    let parsed;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonChunk = text.slice(jsonStart, jsonEnd + 1);
      parsed = JSON.parse(jsonChunk);
    } catch (err) {
      console.error("[broker-coi-check] JSON parse error:", err);
      parsed = {
        summary: "Could not parse JSON, see raw output.",
        issues: [],
        fixes: [],
        sample_email: "",
      };
    }

    return res.status(200).json({
      ok: true,
      result: parsed,
      raw: text,
    });
  } catch (err) {
    console.error("[broker-coi-check] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
