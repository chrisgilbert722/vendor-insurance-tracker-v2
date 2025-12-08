// pages/api/vendor/email-contract-fix.js
// ============================================================
// AI CONTRACT FIX EMAIL GENERATOR (V1)
// Called from Contract Review Cockpit
//
// POST /api/vendor/email-contract-fix
// Body: { vendorId }
//
// Returns:
//  { ok: true, subject, body }
//
// Uses:
//  • vendor.contract_issues_json (or contract_mismatches)
//  • vendor.vendor_name + vendor.email
//  • OpenAI GPT-4.1-mini for generation
// ============================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { vendorId } = req.body || {};

    if (!vendorId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing vendorId." });
    }

    // ============================================================
    // 1) LOAD VENDOR + CONTRACT INTEL
    // ============================================================
    const rows = await sql`
      SELECT
        id,
        vendor_name,
        email,
        contract_json,
        contract_score,
        contract_issues_json,
        contract_mismatches
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found." });
    }

    const vendor = rows[0];

    // contract issues may live in multiple fields depending on history
    const issues =
      vendor.contract_issues_json ||
      vendor.contract_mismatches ||
      [];

    const issueList =
      Array.isArray(issues) && issues.length > 0
        ? issues
        : [{ message: "No contract mismatches found.", severity: "info" }];

    // ============================================================
    // 2) BUILD PROMPT FOR GPT
    // ============================================================
    const prompt = `
You are an insurance compliance assistant.

A vendor needs a contract-compliance fix email to help them correct issues in their contract-relative coverage.

Vendor Name: ${vendor.vendor_name}
Vendor Email: ${vendor.email || "unknown"}

Here are the contract issues:

${JSON.stringify(issueList, null, 2)}

Write a **professional but firm** email asking the vendor (or broker) to update their insurance documentation to satisfy the contract requirements.

Rules:
- Keep it short (150–220 words).
- Use bullet points for each issue.
- Include a clear call to action.
- DO NOT mention AI.
- DO NOT mention severity codes.
- Tone: Polite, corporate, direct.

Return **JSON ONLY** in this format:

{
  "subject": "string",
  "body": "string"
}
`.trim();

    // ============================================================
    // 3) CALL OPENAI
    // ============================================================
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    // Extract only the JSON portion
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    const json = JSON.parse(raw.slice(first, last + 1));

    const subject = json.subject || "Insurance Contract Requirements";
    const body = json.body || "Please update the required documentation.";

    // ============================================================
    // 4) TIMELINE LOG
    // ============================================================
    try {
      await sql`
        INSERT INTO vendor_timeline (vendor_id, action, message, severity, created_at)
        VALUES (
          ${vendorId},
          'ai_contract_fix_email_generated',
          ${"AI-generated contract fix email created."},
          'info',
          NOW()
        );
      `;
    } catch (err) {
      console.error("[email-contract-fix] timeline insert failed:", err);
    }

    // ============================================================
    // 5) RETURN EMAIL PAYLOAD
    // ============================================================
    return res.status(200).json({
      ok: true,
      subject,
      body,
    });

  } catch (err) {
    console.error("[email-contract-fix] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Email generation failed.",
    });
  }
}
