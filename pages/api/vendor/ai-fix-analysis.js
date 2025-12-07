// pages/api/vendor/ai-fix-analysis.js
// ==========================================================
// Vendor Portal V4 — AI Fix Mode Analysis
// Compares requirements_json vs last_coi_json using OpenAI
// and returns a structured list of issues + fix suggestions.
// ==========================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ ok: false, error: "Use POST method for this endpoint." });
    }

    const { token } = req.body || {};

    if (!token) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing token in request body." });
    }

    // 1) Resolve vendor via token
    const tokenRows = await sql`
      SELECT vendor_id, org_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1;
    `;

    if (tokenRows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Invalid or unknown vendor link." });
    }

    const t = tokenRows[0];

    if (t.expires_at && new Date(t.expires_at) < new Date()) {
      return res
        .status(410)
        .json({ ok: false, error: "This vendor link has expired." });
    }

    // 2) Load vendor with requirements + last_coi_json
    const vendorRows = await sql`
      SELECT
        id,
        org_id,
        vendor_name,
        email,
        work_type,
        requirements_json,
        last_coi_json
      FROM vendors
      WHERE id = ${t.vendor_id}
      LIMIT 1;
    `;

    if (vendorRows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found for this token." });
    }

    const vendor = vendorRows[0];

    if (!vendor.requirements_json) {
      return res.status(400).json({
        ok: false,
        error:
          "No requirements profile found for this vendor. Ask your client to configure requirements first.",
      });
    }

    if (!vendor.last_coi_json) {
      return res.status(400).json({
        ok: false,
        error:
          "No COI has been uploaded or parsed yet. Upload a COI before running AI Fix Mode.",
      });
    }

    const requirements = vendor.requirements_json;
    const coi = vendor.last_coi_json;

    // 3) Call OpenAI to compare requirements vs COI
    const prompt = `
You are an insurance compliance assistant.

Compare this vendor's required insurance profile with the coverage actually shown in their latest Certificate of Insurance (COI).

Requirements JSON:
${JSON.stringify(requirements, null, 2)}

COI JSON:
${JSON.stringify(coi, null, 2)}

Your job:
- Identify concrete issues where the COI does NOT meet the requirements.
- Use plain language suitable for a vendor (not a lawyer).
- Summarize what is okay and what is missing.
- Provide suggested wording the vendor can forward to their broker.

Return ONLY valid JSON in this format:

{
  "summary": "High-level explanation in 2–4 sentences.",
  "issues": [
    {
      "type": "coverage_limit_low" | "missing_coverage" | "missing_endorsement" | "policy_expired" | "effective_date_in_future" | "data_missing" | "other",
      "severity": "low" | "medium" | "high" | "critical",
      "field": "string describing what this refers to, e.g. 'General Liability each occurrence'",
      "requirement": "short text describing what is required",
      "actual": "short text describing what the COI currently shows",
      "explanation": "human-friendly explanation of the problem",
      "broker_email": "email paragraph the vendor can copy and send to their broker asking for the correction"
    }
  ]
}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: "Return ONLY valid strict JSON." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message?.content?.trim() || "{}";
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    const json = JSON.parse(raw.slice(first, last + 1));

    const summary = json.summary || "";
    const issues = Array.isArray(json.issues) ? json.issues : [];

    // 4) Optional: log to system_timeline
    await sql`
      INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
      VALUES (
        ${vendor.org_id},
        ${vendor.id},
        'vendor_ai_fix_analysis',
        'Vendor ran AI Fix Mode on their COI.',
        'info'
      );
    `;

    return res.status(200).json({
      ok: true,
      vendorId: vendor.id,
      summary,
      issues,
    });
  } catch (err) {
    console.error("[AI FIX ANALYSIS ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "AI Fix analysis failed.",
    });
  }
}
