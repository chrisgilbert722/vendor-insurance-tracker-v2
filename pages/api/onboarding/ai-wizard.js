// pages/api/onboarding/ai-wizard.js
// AI Onboarding Wizard — Automated Org Setup

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { orgId, vendorCsv } = req.body;

    if (!orgId || !vendorCsv) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId or vendorCsv" });
    }

    // --------------------------------------------------------
    // FORMAT: vendorCsv = array of {name, email, category}
    // --------------------------------------------------------

    const vendorText = vendorCsv
      .map((v) => `${v.name}, ${v.email || "no email"}, ${v.category || "general"}`)
      .join("\n");

    // --------------------------------------------------------
    // 🔥 RUN AI — Analyze Vendors + Generate Rules + Templates
    // --------------------------------------------------------
    const prompt = `
You are the AI Onboarding Wizard for a vendor insurance compliance platform.

A NEW ORGANIZATION is being created.

Your job:
1. Analyze the vendor list.
2. Suggest reasonable coverage requirements based on categories.
3. Generate full RULE ENGINE V3 rule groups + rules for this org.
4. Create default COMMUNICATION TEMPLATES.
5. Create a concise ONBOARDING SUMMARY.

Vendor List:
${vendorText}

OUTPUT MUST BE JSON WITH EXACT FIELDS:

{
  "ruleGroups": [
    {
      "label": "",
      "description": "",
      "severity": "low|medium|high|critical",
      "rules": [
        {
          "type": "coverage|limit|endorsement|date",
          "field": "",
          "condition": "",
          "value": "",
          "severity": "",
          "message": ""
        }
      ]
    }
  ],
  "templates": {
    "vendorWelcome": "",
    "brokerRequest": "",
    "renewalReminder": "",
    "fixRequest": ""
  },
  "summary": ""
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const responseRaw = completion.choices[0].message.content;

    let responseJson;
    try {
      responseJson = JSON.parse(responseRaw);
    } catch (err) {
      console.error("JSON parse error:", err);
      return res.status(200).json({
        ok: true,
        needsFix: true,
        raw: responseRaw,
      });
    }

    // --------------------------------------------------------
    // STORE RULE GROUPS + RULES IN DB
    // --------------------------------------------------------
    for (const group of responseJson.ruleGroups || []) {
      const insertedGroup = await sql`
        INSERT INTO rule_groups (org_id, label, description, severity, active)
        VALUES (${orgId}, ${group.label}, ${group.description}, ${group.severity}, TRUE)
        RETURNING id;
      `;

      const groupId = insertedGroup[0].id;

      for (const r of group.rules || []) {
        await sql`
          INSERT INTO rules_v3 (group_id, type, field, condition, value, message, severity, active)
          VALUES (${groupId}, ${r.type}, ${r.field}, ${r.condition}, ${r.value},
                  ${r.message}, ${r.severity}, TRUE);
        `;
      }
    }

    return res.status(200).json({
      ok: true,
      ruleGroups: responseJson.ruleGroups,
      templates: responseJson.templates,
      summary: responseJson.summary,
    });
  } catch (err) {
    console.error("[AI Onboarding Wizard ERROR]:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
