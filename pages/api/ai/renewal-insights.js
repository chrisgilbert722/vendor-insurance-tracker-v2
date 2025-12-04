// pages/api/ai/renewal-insights.js
import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load renewal schedule + vendor metadata
async function loadRenewalData(orgId) {
  const rows = await sql`
    SELECT 
      prs.*,
      v.name AS vendor_name,
      p.coverage_type,
      p.expiration_date,
      p.effective_date
    FROM policy_renewal_schedule prs
    JOIN vendors v ON v.id = prs.vendor_id
    JOIN policies p ON p.id = prs.policy_id
    WHERE prs.org_id = ${orgId}
      AND prs.status = 'active'
    ORDER BY p.expiration_date ASC;
  `;

  return rows.map((r) => {
    const exp = new Date(r.expiration_date);
    const now = new Date();
    const daysLeft = Math.floor((exp - now) / 86400000);
    return { ...r, daysLeft };
  });
}
function buildPrompt(data) {
  return `
You are the "Renewal Insights Engine" for an enterprise compliance system.

Your job:
- Identify the most urgent renewals.
- Explain the top 3–5 risks.
- Recommend next actions.
- Predict failures.
- Spot coverage patterns.
- Use simple, actionable business language.

Here is the structured input data:

${JSON.stringify(data, null, 2)}

Your JSON output MUST follow:

{
  "summary": "...",
  "priority_list": [
    "Vendor X — 3 days left — high risk — needs follow-up",
    "Vendor Y — expires tomorrow — email broker now",
    "..."
  ],
  "risk_clusters": [
    {
      "label": "Critical (0–3 days)",
      "vendors": ["Vendor A", "Vendor B"]
    },
    {
      "label": "Upcoming (30–90 days)",
      "vendors": ["Vendor C"]
    }
  ],
  "next_actions": [
    "Send renewal request to Vendor A",
    "Escalate Vendor B internally",
    "Request updated COI from Vendor D"
  ]
}

After the JSON, include a readable human summary.
`;
}
export default async function handler(req, res) {
  try {
    const orgId = Number(req.query.orgId || 0);
    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    // Load renewal schedule entries
    const renewalRows = await loadRenewalData(orgId);

    // Build prompt
    const prompt = buildPrompt(renewalRows);

    // Call AI model
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate renewal intelligence." },
      ],
      temperature: 0.25,
    });

    const text = completion.choices?.[0]?.message?.content || "";

    // Extract JSON from model output
    let extracted = {};
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonChunk = text.slice(jsonStart, jsonEnd + 1);
      extracted = JSON.parse(jsonChunk);
    } catch (err) {
      console.error("Renewal insights JSON parse failed:", err);
      extracted = {
        summary: "Could not parse insights JSON.",
        priority_list: [],
        risk_clusters: [],
        next_actions: [],
      };
    }

    return res.status(200).json({
      ok: true,
      insights: extracted,
      raw: text,
    });
  } catch (err) {
    console.error("[renewal-insights] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
// END — renewal-insights AI endpoint
