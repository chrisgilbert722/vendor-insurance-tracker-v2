// pages/api/onboarding/apply-rules-v5.js
// Push AI-generated wizard rules into Rule Engine V5 (DB integration stub)

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  try {
    const { orgId, groups } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId." });
    }
    if (!Array.isArray(groups) || groups.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "No rule groups provided." });
    }

    // NOTE:
    // This DB logic is a GENERIC EXAMPLE.
    // You should adapt table name + columns to match your actual schema.
    //
    // Example table you might have or create:
    //   engine_rules_v5(
    //      id SERIAL PRIMARY KEY,
    //      org_id UUID/INT,
    //      group_label TEXT,
    //      rule_title TEXT,
    //      field_key TEXT,
    //      condition TEXT,
    //      value TEXT,
    //      severity TEXT,
    //      message TEXT,
    //      metadata JSONB,
    //      created_at TIMESTAMPTZ DEFAULT now()
    //   )

    const insertedRuleIds = [];

    for (const group of groups) {
      const groupLabel = group.label || "Untitled Group";
      const description = group.description || null;

      for (const rule of group.rules || []) {
        const field = rule.field || rule.fieldKey || "";
        const condition = rule.condition || rule.operator || "==";
        const value = rule.value != null ? String(rule.value) : null;
        const severity = rule.severity || "medium";
        const message = rule.message || rule.title || "Validation rule";

        // Insert into your rules table
        // Adjust "engine_rules_v5" + columns as needed
        const result = await sql`
          INSERT INTO engine_rules_v5 (
            org_id,
            group_label,
            group_description,
            rule_title,
            field_key,
            condition,
            value,
            severity,
            message,
            metadata
          )
          VALUES (
            ${orgId},
            ${groupLabel},
            ${description},
            ${rule.title || null},
            ${field},
            ${condition},
            ${value},
            ${severity},
            ${message},
            ${JSON.stringify(rule)}
          )
          RETURNING id
        `;

        if (result && result[0] && result[0].id) {
          insertedRuleIds.push(result[0].id);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      message: "Rules applied to Rule Engine V5.",
      count: insertedRuleIds.length,
      ruleIds: insertedRuleIds,
    });
  } catch (err) {
    console.error("[apply-rules-v5] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to apply rules.",
    });
  }
}
