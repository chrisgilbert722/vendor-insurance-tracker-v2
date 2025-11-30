// pages/api/ai/gvi-insights.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST with vendors payload." });
  }

  try {
    const { vendors } = req.body;
    if (!Array.isArray(vendors)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid 'vendors' array." });
    }

    const systemPrompt = `
You are "GVI Brain" — the AI Risk Officer for a vendor insurance compliance platform.

You are given an array of vendor objects with:
- name
- aiScore
- compliance.status (pass, warn, fail, unknown)
- compliance.summary
- compliance.fixedRules / totalRules / remainingRules
- alertsCount
- primaryPolicy.coverage_type, expiration_date, daysLeft

Your job:
1. Provide a high-level summary of overall vendor risk.
2. Identify the top 5 highest-risk vendors and briefly explain why.
3. Identify any positive outliers (extremely safe vendors).
4. Suggest 5 concrete actions for the next 30 days to reduce risk.
5. Use simple, executive-readable language.

Return JSON with this shape:

{
  "summary": "...",
  "top_risk_vendors": [
    { "name": "...", "ai_score": 42, "reason": "..." }
  ],
  "safest_vendors": [
    { "name": "...", "ai_score": 95, "reason": "..." }
  ],
  "recommended_actions": [
    "Action 1 ...",
    "Action 2 ..."
  ]
}

After the JSON, include a short, friendly explanation paragraph.
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Here is the current vendor landscape (JSON):\n" +
            JSON.stringify(vendors, null, 2),
        },
      ],
      temperature: 0.2,
    });

    const text = completion.choices[0].message.content || "";

    let parsed;
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      const jsonChunk = text.slice(start, end + 1);
      parsed = JSON.parse(
        jsonChunk.replace(/```json/gi, "").replace(/```/g, "").trim()
      );
    } catch (err) {
      console.error("[gvi-insights] JSON parse failed:", err);
      parsed = {
        summary: "Could not parse AI JSON. See raw output.",
        top_risk_vendors: [],
        safest_vendors: [],
        recommended_actions: [],
      };
    }

    return res.status(200).json({ ok: true, insights: parsed, raw: text });
  } catch (err) {
    console.error("[gvi-insights] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
