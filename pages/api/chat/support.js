// pages/api/chat/support.js
// Vendor-aware AI Assistant with Rule Engine Explanation Mode

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
    let ruleExplanationBlock = "No rule failures.";

    if (vendorId) {
      // 1) Vendor basic info
      const vendorRows = await sql`
        SELECT id, name, compliance_status, org_id
        FROM vendors
        WHERE id = ${vendorId}
        LIMIT 1;
      `;
      const vendor = vendorRows[0];

      // 2) Policies (supabase)
      const { data: policies = [] } = await supabase
        .from("policies")
        .select("id, coverage_type, carrier, expiration_date")
        .eq("vendor_id", vendorId);

      // 3) Alerts
      const alerts = await sql`
        SELECT code, message, severity
        FROM vendor_alerts
        WHERE vendor_id = ${vendorId}
        ORDER BY severity DESC;
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

      // ============================================================
      // NEW: LOAD RULE DEFINITIONS + GROUP DEFINITIONS
      // ============================================================
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
      ruleExplanationBlock =
        ruleFailures.length === 0
          ? "This vendor has no rule failures."
          : ruleFailures
              .map((f) => {
                const rule = ruleDefs.find((r) => r.id === f.rule_id);
                const group = groupDefs.find((g) => g.id === rule?.group_id);

                return `
RULE FAILURE:
- Rule ID: ${f.rule_id}
- Severity: ${f.severity}
- Group: ${group?.label || "Unknown"}
- Group Description: ${group?.description || "N/A"}
- Field Checked: ${rule?.field || "unknown"}
- Condition: ${rule?.condition || "unknown"}
- Expected Value: ${rule?.value || "none"}
- Failure Message: ${rule?.message || f.message}

EXPLANATION (for AI use):
This rule checks whether the vendor's "${rule?.field}" meets the condition "${
                  rule?.condition
                }" with expected value "${rule?.value}". The vendor did not meet this requirement, triggering a ${f.severity} severity failure.
                `;
              })
              .join("\n");

      // ============================================================
      // BUILD VENDOR CONTEXT BLOCK
      // ============================================================
      vendorContext = `
[VENDOR INFO]
Name: ${vendor?.name}
Status: ${vendor?.compliance_status}

[POLICIES]
${
  policies.length
    ? policies
        .map(
          (p) =>
            `• ${p.coverage_type} — Carrier: ${p.carrier}, Expires: ${p.expiration_date}`
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
            `• [${a.severity}] ${a.code} — ${a.message}`
        )
        .join("\n")
    : "No alerts."
}

[RULE ENGINE FAILURES — STRUCTURED]
${ruleExplanationBlock}

[RENEWAL PREDICTION]
${
  pred
    ? `Risk Score: ${pred.risk_score}
Risk Tier: ${pred.risk_tier}
Fail Chance: ${pred.likelihood_fail}%
On-Time Chance: ${pred.likelihood_on_time}%`
    : "No renewal prediction available."
}
`;
    }

    // ============================================================
    // SYSTEM PROMPT — TEACH AI HOW TO EXPLAIN RULES
    // ============================================================
    const systemMessage = {
      role: "system",
      content: `
You are the AI Assistant for a vendor insurance compliance platform.

Your capabilities:
- Explain rule engine failures in plain English.
- Tell the user EXACTLY why the vendor failed a rule.
- Compare expected vs. actual values if available.
- Interpret conditions ("gte", "lte", "exists", "missing", "requires").
- Suggest precise remediation steps.
- Draft emails to vendors/brokers based on failures.
- Explain renewal predictions.
- Provide next steps for compliance.

RULE EXPLANATION PROTOCOL:
1. Identify the rule group and purpose.
2. Explain what field was checked.
3. Explain the condition (gte/lte/exists/missing/etc.) in simple language.
4. State what the vendor's actual value appears to be (if known).
5. Explain why this caused a failure.
6. Recommend how to fix it (in practical terms).
7. Do NOT invent data not in vendorContext.
`,
    };

    // Context message
    const contextMessage = {
      role: "system",
      content: `
[PATH] ${path}
[ORG] ${orgId}
[VENDOR] ${vendorId || "none"}
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
    console.error("[AI Chat Rule Explain ERROR]:", err);
    return res.status(500).json({ ok: false, error: "Chatbot failed." });
  }
}
