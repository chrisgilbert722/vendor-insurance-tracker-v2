// pages/api/vendor/assistant.js
// Vendor Portal V4 — AI Assistant for Vendors
// Uses token → vendor lookup, then provides contextual AI guidance.

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      ok: false,
      error: "POST only",
    });
  }

  try {
    const { token, question } = req.body || {};

    if (!token || !question) {
      return res.status(400).json({
        ok: false,
        error: "Missing token or question.",
      });
    }

    // ------------------------------------------------------------
    // 1) Lookup vendor + org via vendor_portal_tokens
    // ------------------------------------------------------------
    const portalRows = await sql`
      SELECT vendor_id, org_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (!portalRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Invalid vendor portal link.",
      });
    }

    const { vendor_id: vendorId, org_id: orgId, expires_at } = portalRows[0];

    // Check expiration
    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({
        ok: false,
        error: "This vendor link has expired.",
      });
    }

    // ------------------------------------------------------------
    // 2) Load vendor
    // ------------------------------------------------------------
    const vendorRows = await sql`
      SELECT id, vendor_name, email, category
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1
    `;

    if (!vendorRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found.",
      });
    }

    const vendor = vendorRows[0];

    // ------------------------------------------------------------
    // 3) Load policies
    // ------------------------------------------------------------
    const policies = await sql`
      SELECT
        policy_number,
        carrier,
        coverage_type,
        expiration_date,
        limit_each_occurrence,
        auto_limit,
        work_comp_limit,
        umbrella_limit
      FROM policies
      WHERE vendor_id = ${vendorId}
      ORDER BY expiration_date ASC NULLS LAST
    `;

    // ------------------------------------------------------------
    // 4) Load alerts
    // vendor_alerts table does not exist - return empty array
    // ------------------------------------------------------------
    const alerts = [];

    // ------------------------------------------------------------
    // 5) Load AI extraction (if exists)
    // ------------------------------------------------------------
    let aiData = null;

    try {
      const aiRows = await sql`
        SELECT ai_json
        FROM vendor_ai_cache
        WHERE vendor_id = ${vendorId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (aiRows.length) {
        aiData = aiRows[0].ai_json;
      }
    } catch (err) {
      console.warn("[assistant] no AI cache table:", err);
    }

    // ------------------------------------------------------------
    // 6) Build contextual AI prompt
    // ------------------------------------------------------------
    const prompt = `
You are a friendly insurance compliance assistant for vendors.

Your job:
- Explain requirements clearly
- Help vendors understand what is wrong
- Tell them exactly what to fix or upload
- Be supportive and simple (8th grade reading level)

Vendor info:
${JSON.stringify(vendor, null, 2)}

Policies:
${JSON.stringify(policies, null, 2)}

Alerts:
${JSON.stringify(alerts, null, 2)}

AI Extraction (may be null):
${JSON.stringify(aiData, null, 2)}

Vendor question:
"${question}"

Respond with:
- A short explanation
- A bullet list of what they should do next
- DO NOT mention internal scoring or systems
- Keep it actionable and simple
`;

    // ------------------------------------------------------------
    // 7) Run OpenAI completion
    // ------------------------------------------------------------
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.3,
      max_tokens: 350,
      messages: [
        { role: "system", content: "You provide friendly compliance guidance to vendors." },
        { role: "user", content: prompt },
      ],
    });

    const reply = completion.choices[0]?.message?.content || "";

    // ------------------------------------------------------------
    // 8) Return assistant reply
    // ------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      reply,
    });
  } catch (err) {
    console.error("[vendor/assistant] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Vendor assistant failed.",
    });
  }
}
