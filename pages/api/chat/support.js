// pages/api/chat/support.js
// Vendor-aware AI Assistant with Rule Engine Explanation + Auto-Fix Mode

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

    // ============================================================
    // LOAD CONTEXT IF vendorId PROVIDED
    // ============================================================
    let vendorContext = "No vendor selected.";
    let ruleExplanationBlock = "This vendor has no rule failures.";

    if (vendorId) {
      // 1) Vendor basic info
      const vendorRows = await sql`
        SELECT id, name, compliance_status, org_id
        FROM vendors
        WHERE id = ${vendorId}
        LIMIT 1;
      `;
      const vendor = vendorRows[0];

      // 2) Policies (Supabase)
      const { data: policies = [] } = await supabase
        .from("policies")
        .select("id, coverage_type, carrier, expiration_date")
        .eq("vendor_id", vendorId);

      // 3) Alerts
      const alerts = await sql`
        SELECT code, message, severity
        FROM vendor_alerts
        WHERE vendor_id = ${vendorId}
        ORDER BY severity DESC, created_at DESC NULLS LAST;
      `;

      // 4) Rule failures
      const ruleFailures = await sql`
        SELECT rule_id, message, severity, passed
        FROM rule_results_v3
        WHERE vendor_id = ${vendorId} AND passed = FALSE;
      `;

      // 5) Renewal prediction
      const renewPred = await sql`
        SELECT risk_score, risk_tier, likelihood_fail, likelihood_on_time
        FROM renewal_predictions
        WHERE vendor_id = ${vendorId}
        LIMIT 1;
      `;
      const pred = renewPred[0];

      // 6) Rule + Group definitions
      const ruleDefs = await sql`
        SELECT id, group_id, type, field, condition, value, message, severity
        FROM rules_v3
        WHERE group_id IN (
          SELECT id FROM rule_groups WHERE org_id = ${orgId}
        );
      `;

      const groupDefs = await sql`
        SELECT id, label, description, severity
        FROM rule_groups
        WHERE org_id = ${orgId};
      `;

      // ============================================================
      // BUILD RULE EXPLANATION BLOCK
      // ============================================================
      if (ruleFailures.length > 0) {
        ruleExplanationBlock = ruleFailures
          .map((f) => {
            const rule = ruleDefs.find((r) => r.id === f.rule_id);
            const group = groupDefs.find((g) => g.id === rule?.group_id);

            return `
RULE FAILURE:
- Rule ID: ${f.rule_id}
- Severity: ${f.severity || rule?.severity || "unknown"}
- Group: ${group?.label || "Unknown"}
- Group Description: ${group?.description || "N/A"}
- Field Checked: ${rule?.field || "unknown"}
- Condition: ${rule?.condition || "unknown"}
- Expected Value: ${rule?.value || "none"}
- Failure Message: ${rule?.message || f.message || "Rule failed for unknown reason"}

INTERPRETATION FOR AI:
This rule checks whether the vendor's "${rule?.field}" satisfies the condition "${
              rule?.condition
            }" with expected value "${rule?.value}". The vendor did NOT meet this requirement, causing a ${
              f.severity || rule?.severity || "policy"
            }-level failure.
`;
          })
          .join("\n");
      }

      // ============================================================
      // BUILD VENDOR CONTEXT BLOCK
      // ============================================================
      vendorContext = `
[VENDOR INFO]
Name: ${vendor?.name || "Unknown"}
Status: ${vendor?.compliance_status || "Unknown"}
Org ID: ${vendor?.org_id || "Unknown"}

[POLICIES]
${
  policies.length
    ? policies
        .map(
          (p) =>
            `• ${p.coverage_type || "Unknown"} — Carrier: ${
              p.carrier || "Unknown"
            }, Expires: ${p.expiration_date || "Unknown"}`
        )
        .join("\n")
    : "No policies found."
}

[ALERTS]
${
  alerts.length
    ? alerts
        .map(
          (a) =>
            `• [${a.severity || "unknown"}] ${a.code || ""} — ${
              a.message || ""
            }`
        )
        .join("\n")
    : "No alerts."
}

[RULE ENGINE FAILURES]
${ruleExplanationBlock}

[RENEWAL PREDICTION]
${
  pred
    ? `- Risk Score: ${pred.risk_score}
- Risk Tier: ${pred.risk_tier}
- Likelihood of Failure: ${pred.likelihood_fail}%
- Likelihood of On-Time Renewal: ${pred.likelihood_on_time}%`
    : "No renewal prediction available."
}
`;
    }

    // ============================================================
    // SYSTEM PROMPT — AI EXPLANATION + AUTO-FIX MODE
    // ============================================================
    const systemMessage = {
      role: "system",
      content: `
You are the AI Assistant for a vendor insurance compliance platform.

You do 3 primary jobs:

1) EXPLAIN
- Explain vendor compliance status.
- Explain why specific rules failed.
- Explain alerts, their severity, and business impact.
- Explain renewal predictions and risk tiers.

2) AUTO-FIX
- Propose a concrete remediation plan for this vendor.
- List specific steps the admin or vendor should take.
- Prioritize steps by impact (fix high severity first).
- Suggest which documents, limits, or endorsements are missing.
- Suggest whether the vendor should be escalated or paused.

3) COMMUNICATE
- Generate email templates to vendors and/or brokers.
- Your emails should be professional, actionable, and specific to the failures.
- You may generate both an internal note and an external email.

When the user asks something like:
- "Auto-fix this vendor" 
- "What should I do next?"
- "Generate fix plan"
You must output **four clearly labeled sections**:

1) SUMMARY — one short paragraph summarizing this vendor’s situation.
2) ISSUES — bullet list of key failures and alerts, each with severity.
3) ACTION PLAN — numbered list of recommended steps (with who should act: admin / vendor / broker).
4) EMAIL TEMPLATES — one email to the vendor and one to the broker (if applicable).

Do NOT invent vendor data that is not in the context. If a value is unknown, say "based on the available data" and respond conceptually.

Always be clear, concise, and helpful. You are allowed to be opinionated about risk (e.g. "high risk, should not be approved yet").
`,
    };

    // CONTEXT MESSAGE
    const contextMessage = {
      role: "system",
      content: `
[PATH] ${path}
[ORG] ${orgId || "unknown"}
[VENDOR] ${vendorId || "none"}

CONTEXT DATA:
${vendorContext}
`,
    };

    const recent = messages.slice(-8);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [systemMessage, contextMessage, ...recent],
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    return res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error("[AI Chat Auto-Fix ERROR]:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Chatbot failed to respond." });
  }
}
