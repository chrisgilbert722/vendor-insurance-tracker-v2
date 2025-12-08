// pages/api/vendor/fix-plan.js
// ============================================================
// FIX PLAN ENGINE (Patched for Vercel + Local Dev)
// ============================================================

import { Client } from "pg";
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let db = null;

  try {
    const vendorId = Number(req.query.vendorId);
    const orgId = Number(req.query.orgId);

    if (!vendorId || !orgId) {
      return res.status(400).json({ ok: false, error: "Missing vendorId or orgId" });
    }

    // ---------------------------------------------
    // CONNECT TO DATABASE
    // ---------------------------------------------
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    // ---------------------------------------------
    // LOAD VENDOR
    // ---------------------------------------------
    const vendorRes = await db.query(
      `
      SELECT id, org_id, name, email, phone, address
      FROM public.vendors
      WHERE id = $1
      `,
      [vendorId]
    );

    if (!vendorRes.rows.length) {
      return res.status(404).json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorRes.rows[0];

    // ---------------------------------------------
    // LOAD POLICIES (PATCHED — removed risk_score)
    // ---------------------------------------------
    const policiesRes = await db.query(
      `
      SELECT
        id,
        coverage_type,
        policy_number,
        carrier,
        expiration_date,
        limit_each_occurrence,
        limit_aggregate
      FROM public.policies
      WHERE vendor_id = $1
      ORDER BY expiration_date ASC NULLS LAST
      `,
      [vendorId]
    );

    const policies = policiesRes.rows;

    // ---------------------------------------------
    // BUILD INTERNAL RULE ENGINE URL
    // ---------------------------------------------
    const host =
      req.headers.host && req.headers.host.startsWith("localhost")
        ? `http://${req.headers.host}`
        : `https://${req.headers.host}`;

    const engineUrl = `${host}/api/engine/run-v3`;

    // ---------------------------------------------
    // RUN RULE ENGINE IN DRY MODE
    // ---------------------------------------------
    const engineRes = await fetch(engineUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId,
        orgId,
        dryRun: true
      })
    });

    const engineJson = await engineRes.json();

    if (!engineJson.ok) {
      return res.status(500).json({
        ok: false,
        error: engineJson.error || "Rule Engine failed"
      });
    }

    const failingRules = engineJson.failingRules || [];

    // ---------------------------------------------
    // COMPLIANT → SIMPLE PLAN
    // ---------------------------------------------
    if (failingRules.length === 0) {
      return res.status(200).json({
        ok: true,
        steps: ["No action required — vendor appears compliant."],
        vendorEmailSubject: "Your COI Review — No Issues Found",
        vendorEmailBody: `Hi ${vendor.name},

We reviewed your Certificate of Insurance and found no outstanding issues.

Thank you for maintaining compliance.

– Compliance Team`,
        internalNotes: "Vendor fully compliant — no further review required."
      });
    }

    // ---------------------------------------------
    // PREP FAILING RULES FOR AI
    // ---------------------------------------------
    const ruleSummaries = failingRules.map(r => ({
      ruleId: r.ruleId,
      field: r.fieldKey,
      operator: r.operator,
      expected: r.expectedValue,
      severity: r.severity || "medium",
      message: r.message
    }));

    // ---------------------------------------------
    // AI GENERATION
    // ---------------------------------------------
    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        ok: true,
        steps: [
          "Review missing and failing coverage requirements.",
          "Request updated COI from the vendor/broker.",
          "Re-run compliance after receiving updated documentation."
        ],
        vendorEmailSubject: "Request for Updated Certificate of Insurance",
        vendorEmailBody:
          "Please provide an updated Certificate of Insurance meeting our coverage requirements.",
        internalNotes: "AI disabled — using fallback fix plan."
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are an insurance compliance expert. Convert the failing rules into a clear remediation plan.

Failing Rules:
${JSON.stringify(ruleSummaries, null, 2)}

Policies:
${JSON.stringify(policies, null, 2)}

Return ONLY valid JSON format:
{
  "steps": ["...", "..."],
  "vendorSubject": "...",
  "vendorBody": "...",
  "internalNotes": "..."
}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }]
    });

    let content = completion.choices?.[0]?.message?.content?.trim() || "{}";

    if (content.startsWith("```")) {
      content = content.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        steps: ["AI returned invalid data — retry."],
        vendorSubject: "COI Issues Detected",
        vendorBody:
          "We identified coverage issues but AI failed to produce a full explanation. Please re-run the fix plan.",
        internalNotes: content
      };
    }

    return res.status(200).json({
      ok: true,
      steps: parsed.steps || [],
      vendorEmailSubject: parsed.vendorSubject || "",
      vendorEmailBody: parsed.vendorBody || "",
      internalNotes: parsed.internalNotes || ""
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Fix plan generation failed"
    });
  } finally {
    try {
      await db?.end();
    } catch {}
  }
}
