// pages/api/vendor/fix-plan.js
import { Client } from "pg";
import OpenAI from "openai";

/**
 * GET /api/vendor/fix-plan?vendorId=...&orgId=...
 *
 * Returns:
 * {
 *   ok: true,
 *   steps: string[],
 *   vendorEmailSubject: string,
 *   vendorEmailBody: string,
 *   internalNotes: string
 * }
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { vendorId, orgId } = req.query;

  const parsedVendorId = parseInt(vendorId, 10);
  if (!parsedVendorId || Number.isNaN(parsedVendorId) || !orgId) {
    return res.status(400).json({
      ok: false,
      error: "Missing or invalid vendorId or orgId",
    });
  }

  let db = null;

  try {
    // 1️⃣ Load vendor, org, policies from Postgres
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    const vendorRes = await db.query(
      `
      SELECT id, org_id, name, email
      FROM public.vendors
      WHERE id = $1
      `,
      [parsedVendorId]
    );

    if (vendorRes.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorRes.rows[0];

    const orgRes = await db.query(
      `
      SELECT id, name
      FROM public.orgs
      WHERE id = $1
      `,
      [orgId]
    );

    const organization = orgRes.rows[0] || null;

    const policiesRes = await db.query(
      `
      SELECT
        id,
        policy_number,
        carrier,
        coverage_type,
        effective_date,
        expiration_date,
        limit_each_occurrence,
        limit_aggregate,
        risk_score,
        status
      FROM public.policies
      WHERE vendor_id = $1
      ORDER BY created_at DESC
      `,
      [parsedVendorId]
    );

    const policies = policiesRes.rows;

    // 2️⃣ Call existing compliance engine for this vendor + org
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `http://localhost:3000`;

    const complianceUrl = `${baseUrl}/api/requirements/check?vendorId=${parsedVendorId}&orgId=${orgId}`;

    const compRes = await fetch(complianceUrl);
    const compliance = await compRes.json();

    if (!compRes.ok || !compliance.ok) {
      throw new Error(
        compliance.error || "Compliance engine failed for Fix Plan"
      );
    }

    // 3️⃣ Call OpenAI to generate Hybrid G+Legal Elite Fix Plan
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an expert commercial insurance compliance analyst.
Tone: Hybrid G-MODE blunt + professional/legal-safe.
Audience: Internal risk/compliance team AND vendor contact.
Your goal: produce a clear, structured remediation plan.

You will receive:
- Organization info
- Vendor info
- Policies on file
- Compliance engine results (missing/failing/passing)

You MUST respond in STRICT JSON:

{
  "steps": [
    "Step 1...",
    "Step 2..."
  ],
  "vendorEmailSubject": "Subject line here",
  "vendorEmailBody": "Full plain text email body here (no JSON, just a normal email).",
  "internalNotes": "Short, direct, internal note summarizing risk and urgency."
}

Rules:
- Steps: 3–7 concrete actions to bring this vendor into full compliance.
- Vendor email: clear, polite but firm, no insults, no threats.
- Internal notes: speak like a senior risk manager talking to PM/GC/legal.
- Do NOT hallucinate coverage: only reference what is in policies/compliance.
- If coverage is missing, say what needs to be added or updated.
- If limits are too low, say what limits are required.
- If dates are expired/expiring, say renewal is needed with timeline.
- Use normal English. No markdown. No bullet syntax. Just text where needed.

Organization:
${JSON.stringify(
  {
    id: organization?.id || orgId,
    name: organization?.name || "Unknown organization",
  },
  null,
  2
)}

Vendor:
${JSON.stringify(
  {
    id: vendor.id,
    name: vendor.name,
    email: vendor.email || null,
  },
  null,
  2
)}

Policies:
${JSON.stringify(policies, null, 2)}

Compliance:
${JSON.stringify(
  {
    summary: compliance.summary,
    missing: compliance.missing,
    failing: compliance.failing,
    passing: compliance.passing,
  },
  null,
  2
)}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a hybrid G-Mode blunt + professional commercial insurance compliance analyst.",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = completion.choices[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Fix Plan JSON parse error:", err);
      parsed = {
        steps: [
          "Review missing and failing coverage items.",
          "Request updated COI and endorsements from vendor/broker.",
          "Update policies in system and re-run compliance.",
        ],
        vendorEmailSubject: "Request for updated Certificate of Insurance",
        vendorEmailBody:
          "Please provide an updated COI that satisfies our current coverage and limit requirements.",
        internalNotes:
          "AI response failed to parse as JSON. Using fallback generic remediation steps.",
      };
    }

    return res.status(200).json({
      ok: true,
      steps: parsed.steps || [],
      vendorEmailSubject: parsed.vendorEmailSubject || "",
      vendorEmailBody: parsed.vendorEmailBody || "",
      internalNotes: parsed.internalNotes || "",
    });
  } catch (err) {
    console.error("FIX PLAN ENGINE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Fix Plan Engine failed",
    });
  } finally {
    if (db) {
      try {
        await db.end();
      } catch (_) {}
    }
  }
}
