// pages/api/onboarding/apply-rules-v5.js
// ============================================================
// Apply AI-generated rules into Rule Engine V5
// - UUID safe via resolveOrg
// - Logs rules_applied activity
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "@resolveOrg";

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
    const { groups } = req.body;

    if (!Array.isArray(groups) || groups.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "No rule groups provided." });
    }

    // 🔑 Resolve external_uuid → INTERNAL org INT
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const insertedRuleIds = [];
    let ruleCount = 0;

    for (const group of groups) {
      const groupLabel = group.label || "Untitled Group";
      const description = group.description || null;

      for (const rule of group.rules || []) {
        const field = rule.field || rule.fieldKey || "";
        const condition = rule.condition || rule.operator || "==";
        const value = rule.value != null ? String(rule.value) : null;
        const severity = rule.severity || "medium";
        const message = rule.message || rule.title || "Validation rule";

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
            ${orgIdInt},
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

        if (result?.[0]?.id) {
          insertedRuleIds.push(result[0].id);
          ruleCount += 1;
        }
      }
    }

    // ---------------- 🔥 AI ACTIVITY LOG ----------------
    await sql`
      INSERT INTO ai_activity_log (org_id, event_type, message, metadata)
      VALUES (
        ${orgIdInt},
        'rules_applied',
        'AI-applied compliance rules to rule engine',
        ${JSON.stringify({
          engine: "v5",
          groupsApplied: groups.length,
          rulesApplied: ruleCount,
        })}
      );
    `;

    return res.status(200).json({
      ok: true,
      message: "Rules applied to Rule Engine V5.",
      count: ruleCount,
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
