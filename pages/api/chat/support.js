// pages/api/chat/support.js
// Upgraded AI Assistant with vendor-awareness, rule engine context, renewal context

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { messages, orgId, vendorId, path } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ ok: false, error: "Missing messages" });
    }

    // ----------------------------------------------------------------------
    // 🔥 Load vendor-level context if vendorId is provided
    // ----------------------------------------------------------------------
    let vendorContext = "No vendor context available.";

    if (vendorId) {
      // Load basic vendor
      const vendorRows = await sql`
        SELECT id, name, compliance_status, org_id 
        FROM vendors
        WHERE id = ${vendorId}
        LIMIT 1;
      `;
      const vendor = vendorRows[0];

      // Load policies
      const policyRows = await supabase
        .from("policies")
        .select("id, coverage_type, carrier, expiration_date, extracted")
        .eq("vendor_id", vendorId);

      // Load alerts
      const alerts = await sql`
        SELECT code, message, severity 
        FROM vendor_alerts
        WHERE vendor_id = ${vendorId}
        ORDER BY severity DESC;
      `;

      // Load Rule Engine V3 failures
      const ruleFailures = await sql`
        SELECT rr.rule_id, rr.message, rr.severity
        FROM rule_results_v3 rr
        WHERE rr.vendor_id = ${vendorId} AND rr.passed = FALSE;
      `;

      // Load renewal predictions
      const renewPred = await sql`
        SELECT risk_score, risk_tier, likelihood_fail, likelihood_on_time
        FROM renewal_predictions
        WHERE vendor_id = ${vendorId}
        LIMIT 1;
      `;
      const r = renewPred[0];

      vendorContext = `
Vendor Context:
- Name: ${vendor?.name || "Unknown"}
- Compliance Status: ${vendor?.compliance_status || "Unknown"}

Policies:
${(policyRows.data || [])
  .map(
    (p) =>
      `• ${p.coverage_type} (Carrier: ${p.carrier}, Expires: ${p.expiration_date})`
  )
  .join("\n")}

Alerts:
${alerts.map((a) => `• [${a.severity}] ${a.message}`).join("\n") || "None"}

Rule Failures:
${ruleFailures
  .map((f) => `• ${f.message} (severity: ${f.severity})`)
  .join("\n") || "None"}

Renewal Prediction:
${
  r
    ? `- Risk Score: ${r.risk_score}
- Tier: ${r.risk_tier}
- Fail Likelihood: ${r.likelihood_fail}%
- On-Time Likelihood: ${r.likelihood_on_time}%`
    : "No prediction data"
}
`;
    }

    // ----------------------------------------------------------------------
    // 🔥 SYSTEM PROMPT — stronger, more directive AI personality
    // ----------------------------------------------------------------------
    const systemMessage = {
      role: "system",
      content: `
You are the AI Assistant for a vendor insurance compliance platform.

Your capabilities:
- Explain vendor risk, rule failures, alerts, missing coverage.
- Explain renewal predictions in simple terms.
- Provide next steps for compliance.
- Suggest broker or vendor communication.
- Help admins navigate the interface.
- Answer questions about how to use the platform.

DO NOT hallucinate unknown data. 
If asked about unprovided vendor details: summarize based on the provided vendorContext ONLY.

Be concise, accurate, and friendly.
`,
    };

    const contextMessage = {
      role: "system",
      content: `
Additional Context:
- Page: ${path}
- orgId: ${orgId}
${vendorId ? vendorContext : "No vendor selected."}
`,
    };

    // ----------------------------------------------------------------------
    // 🔥 Run OpenAI
    // ----------------------------------------------------------------------
    const recent = messages.slice(-8);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [systemMessage, contextMessage, ...recent],
    });

    return res.status(200).json({
      ok: true,
      reply: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("AI Chatbot Error:", err);
    return res.status(500).json({ ok: false, error: "Chatbot failed." });
  }
}
