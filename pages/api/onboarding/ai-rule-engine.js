// pages/api/onboarding/ai-rule-engine.js
// ============================================================
// AUTOPILOT — AI RULE ENGINE (BACKEND STEP)
// - Called ONLY by onboarding/start.js
// - Generates rule groups + rules
// - Persists to DB
// - Logs ai_activity_log
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";
import { openai } from "../../../lib/openaiClient";

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // ----------------------------------------------------------
    // 1) Resolve org (UUID → INT)
    // ----------------------------------------------------------
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    // ----------------------------------------------------------
    // 2) Load vendors (context for AI)
    // ----------------------------------------------------------
    const vendors = await sql`
      SELECT name AS vendor_name, email
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY id ASC;
    `;

    const vendorText =
      vendors.length > 0
        ? vendors
            .map(
              (v) =>
                `${v.vendor_name || ""}, ${v.email || "no-email"}, ${
                  v.category || "uncategorized"
                }`
            )
            .join("\n")
        : "(no vendors yet)";

    // ----------------------------------------------------------
    // 3) AI PROMPT
    // ----------------------------------------------------------
    const systemPrompt = `
You are an insurance compliance engine.

Your task:
- Design realistic insurance rule groups
- Based on vendor industries
- Suitable for automated compliance enforcement

Return ONLY valid JSON in this exact shape:

{
  "ruleGroups": [
    {
      "label": "string",
      "description": "string",
      "severity": "low|medium|high|critical",
      "rules": [
        {
          "type": "coverage|limit|endorsement|date",
          "field": "string",
          "condition": "exists|missing|gte|lte|requires|before|after",
          "value": "string",
          "severity": "low|medium|high|critical",
          "message": "string"
        }
      ]
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Vendor list:\n${vendorText}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("[ai-rule-engine] JSON parse error:", raw);
      return res.status(200).json({
        ok: false,
        error: "AI returned invalid JSON",
      });
    }

    const ruleGroups = Array.isArray(parsed.ruleGroups)
      ? parsed.ruleGroups
      : [];

    if (!ruleGroups.length) {
      return res.status(200).json({
        ok: false,
        error: "No rule groups generated",
      });
    }

    // ----------------------------------------------------------
    // 4) Persist rule groups + rules
    // ----------------------------------------------------------
    let totalRules = 0;

    for (const g of ruleGroups) {
      const group = await sql`
        INSERT INTO rule_groups (
          org_id, label, description, severity, active
        )
        VALUES (
          ${orgId},
          ${g.label || "AI Rule Group"},
          ${g.description || ""},
          ${g.severity || "medium"},
          TRUE
        )
        RETURNING id;
      `;

      const groupId = group[0].id;
      const rules = Array.isArray(g.rules) ? g.rules : [];

      for (const r of rules) {
        await sql`
          INSERT INTO rules_v3 (
            group_id,
            type,
            field,
            condition,
            value,
            message,
            severity,
            active
          )
          VALUES (
            ${groupId},
            ${r.type || "coverage"},
            ${r.field || "unknown"},
            ${r.condition || "exists"},
            ${String(r.value ?? "")},
            ${r.message || "Requirement not met"},
            ${r.severity || "medium"},
            TRUE
          );
        `;
        totalRules++;
      }
    }

    // ----------------------------------------------------------
    // 5) AI ACTIVITY LOG
    // ----------------------------------------------------------
    await sql`
      INSERT INTO ai_activity_log (
        org_id, event_type, message, metadata
      )
      VALUES (
        ${orgId},
        'rules_generated',
        'AI rule engine generated compliance rules',
        ${JSON.stringify({
          groups: ruleGroups.length,
          rules: totalRules,
        })}
      );
    `;

    return res.status(200).json({
      ok: true,
      ruleGroups: ruleGroups.length,
      rules: totalRules,
    });
  } catch (err) {
    console.error("[ai-rule-engine] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI rule engine failed",
    });
  }
}
