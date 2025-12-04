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

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: "Missing messages" });
    }

    // ----------------------------------------------------------------------
    // 🔥 Load vendor-level context if vendorId is provided
    // ----------------------------------------------------------------------
    let vendorContext = "No vendor context available.";

    if (vendorId) {
      // 1) Vendor basic info
      const vendorRows = await sql`
        SELECT id, name, compliance_status, org_id
        FROM vendors
        WHERE id = ${vendorId}
        LIMIT 1;
      `;
      const vendor = vendorRows[0];

      // 2) Policies from Supabase
      const { data: policyRows = [], error: policyErr } = await supabase
        .from("policies")
        .select("id, coverage_type, carrier, expiration_date")
        .eq("vendor_id", vendorId);

      if (policyErr) {
        console.error("[chat/support] policies error:", policyErr);
      }

      // 3) Alerts from Neon
      const alerts = await sql`
        SELECT code, message, severity
        FROM vendor_alerts
        WHERE vendor_id = ${vendorId}
        ORDER BY severity DESC, created_at DESC NULLS LAST;
      `;

      // 4) Rule Engine V3 failures
      const ruleFailures = await sql`
        SELECT rr.rule_id, rr.message, rr.severity
        FROM rule_results_v3 rr
        WHERE rr.vendor_id = ${vendorId} AND rr.passed = FALSE;
      `;

      // 5) Renewal predictions
      const renewPred = await sql`
        SELECT risk_score, risk_tier, likelihood_fail, likelihood_on_time
        FROM renewal_predictions
        WHERE vendor_id = ${vendorId}
        LIMIT 1;
      `;
      const r = renewPred[0];

      vendorContext = `
[VENDOR CONTEXT]
Name: ${vendor?.name || "Unknown"}
Compliance Status: ${vendor?.compliance_status || "Unknown"}
Org ID: ${vendor?.org_id || "Unknown"}

[POLICIES]
${
  policyRows && policyRows.length
    ? policyRows
        .map(
          (p) =>
            `• ${p.coverage_type || "Unknown"} — Carrier: ${
              p.carrier || "Unknown"
            }, Expires: ${p.expiration_date || "Unknown"}`
        )
        .join("\n")
    : "• No policies found."
}

[ALERTS]
${
  alerts && alerts.length
    ? alerts
        .map(
          (a) =>
            `• [${a.severity || "unknown"}] ${a.code || ""} — ${
              a.message || ""
            }`
        )
        .join("\n")
    : "• No alerts."
}

[RULE FAILURES]
${
  ruleFailures && ruleFailures.length
    ? ruleFailures
        .map(
          (f) =>
            `• Severity: ${f.severity || "unknown"} — ${f.message || "Unknown rule failure"}`
        )
        .join("\n")
    : "• No failing rules."
}

[RENEWAL PREDICTION]
${
  r
    ? `Risk Score: ${r.risk_score}
Risk Tier: ${r.risk_tier}
Likelihood of Failure: ${r.likelihood_fail}%
Likelihood of On-Time Renewal: ${r.likelihood_on_time}%`
    : "No prediction recorded for this vendor."
}
`;
    }

    // ----------------------------------------------------------------------
    // 🔥 SYSTEM PROMPT — define assistant role clearly
    // ----------------------------------------------------------------------
    const systemMessage = {
      role: "system",
      content: `
You are the AI Assistant for a vendor insurance compliance platform.

You can:
- Explain vendor compliance status.
- Explain rule engine failures in clear language.
- Explain vendor alerts and what they mean.
- Explain renewal predictions and risk tiers.
- Suggest next steps for the admin (who to contact, what to change).
- Draft emails to vendors and brokers.
- Help navigate the app (“where do I go to see X?”).

Rules:
- Do NOT invent vendor data beyond what is in the context.
- If something is not in context, answer conceptually and say it’s an example.
- Always speak clearly and concisely, as if to a busy risk manager.
- You are allowed to generate email templates and action plans.
`,
    };

    // ----------------------------------------------------------------------
    // 🔥 CONTEXT MESSAGE — inject org + vendor context
    // ----------------------------------------------------------------------
    const contextMessage = {
      role: "system",
      content: `
[CONTEXT]
Current Path: ${path || "unknown"}
Org ID: ${orgId || "unknown"}
Vendor ID: ${vendorId || "none"}

${vendorId ? vendorContext : "No specific vendor selected."}
`,
    };

    // Only keep recent messages to control token usage
    const recentMessages = messages.slice(-8);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [systemMessage, contextMessage, ...recentMessages],
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      ok: true,
      reply,
    });
  } catch (err) {
    console.error("[/api/chat/support] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Chatbot failed." });
  }
}
