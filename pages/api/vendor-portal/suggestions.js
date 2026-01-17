// pages/api/vendor/suggestions.js
// Vendor Portal V4 — Smart Suggestions API
// Returns an AI-generated suggestion block for the vendor portal.

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
    return res
      .status(405)
      .json({ ok: false, error: "POST only" });
  }

  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendor token.",
      });
    }

    // 1) Lookup vendor + org from vendor_portal_tokens
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

    // Token expired?
    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({
        ok: false,
        error: "This vendor link has expired.",
      });
    }

    // 2) Load vendor information
    const vendorRows = await sql`
      SELECT id, name, email, org_id
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

    // 3) Load policies
    const policyRows = await sql`
      SELECT policy_number, carrier, coverage_type, expiration_date
      FROM policies
      WHERE vendor_id = ${vendorId}
      ORDER BY expiration_date ASC NULLS LAST
    `;

    // 4) Load alerts
    // vendor_alerts table does not exist - return empty array
    const alertRows = [];

    // 5) Build AI prompt
    const prompt = `
You are an insurance compliance AI assistant.

Your task is to generate a **bullet list of Smart Suggestions** for a vendor.

Input data:
Vendor:
${JSON.stringify(vendor, null, 2)}

Policies:
${JSON.stringify(policyRows, null, 2)}

Alerts:
${JSON.stringify(alertRows, null, 2)}

Guidelines:
- Speak directly to the vendor ("You should…").
- Keep the language friendly but actionable.
- Focus on the **next steps** needed to fix issues or stay compliant.
- If there are no issues, suggest best practices.
- If policies are near expiration, warn them.
- If important fields are missing, suggest supplying them.
- Respond ONLY with the suggestions text (no intro, no outro).

Return format:
Plain text instructions with bullet points.
`;

    // 6) Generate AI suggestions
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        { role: "system", content: "You provide compliance suggestions." },
        { role: "user", content: prompt },
      ],
    });

    const suggestions = completion.choices[0]?.message?.content || "";

    // 7) Respond
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      suggestions,
    });
  } catch (err) {
    console.error("[vendor/suggestions] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to generate vendor suggestions.",
    });
  }
}
