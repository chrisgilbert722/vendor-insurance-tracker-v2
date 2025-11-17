// pages/api/vendor/fix-plan.js
import { Client } from "pg";
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  let db = null;

  try {
    const { vendorId, orgId } = req.query;

    if (!vendorId || !orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing vendorId or orgId" });
    }

    // 1️⃣ Load vendor + policies from DB
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    const vendorRes = await db.query(
      `
      SELECT id, org_id, name, email, phone, address
      FROM public.vendors
      WHERE id = $1
      `,
      [vendorId]
    );

    if (vendorRes.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorRes.rows[0];

    const policiesRes = await db.query(
      `
      SELECT id,
             coverage_type,
             policy_number,
             carrier,
             expiration_date,
             limit_each_occurrence,
             limit_aggregate,
             risk_score
      FROM public.policies
      WHERE vendor_id = $1
      ORDER BY created_at DESC
      `,
      [vendorId]
    );

    const policies = policiesRes.rows;

    // 2️⃣ Call existing compliance engine
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`;

    const complianceRes = await fetch(
      `${baseUrl}/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`
    );

    const complianceData = await complianceRes.json();

    if (!complianceData.ok) {
      return res.status(500).json({
        ok: false,
        error:
          complianceData.error ||
          "Compliance engine failed while generating fix plan.",
      });
    }

    const { summary, missing, failing, passing } = complianceData;

    // 3️⃣ AI — Generate fix steps + emails (Hybrid G + Legal)
    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        ok: true,
        steps: [
          "Review missing and failing coverage for this vendor.",
          "Request an updated COI from the vendor and/or broker.",
          "Verify the new COI meets all limits, endorsements, and expiration requirements.",
        ],
        vendorEmailSubject: "Request for updated Certificate of Insurance",
        vendorEmailBody:
          "Please provide an updated Certificate of Insurance that satisfies our current coverage requirements.",
        internalNotes:
          "OpenAI API key not configured. AI-generated plan disabled; using fallback generic steps.",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an insurance compliance and construction risk expert writing for a general contractor / owner.

Tone: 
- Hybrid of G-MODE (direct, blunt, no fluff) 
- AND legal-safe professional: no insults, no threats, no promises beyond facts.

You are given:
- Vendor details
- Policy snapshot
- Compliance result (missing coverage, failing rules, passing rules)
- Summary of compliance status

You must output STRICT JSON:

{
  "steps": ["...", "...", "..."],
  "vendorEmailSubject": "...",
  "vendorEmailBody": "...",
  "internalNotes": "..."
}

Where:
- "steps" = a 3–7 item checklist of what this organization must do to bring the vendor into compliance.
- "vendorEmailSubject" = a clear, professional subject line for the email to the vendor or broker.
- "vendorEmailBody" = a concise, professional email in plain text asking for exactly what is needed (coverage, limits, endorsements, corrected dates, etc.). It must be polite, firm, and legally safe.
- "internalNotes" = 3–6 sentences explaining to the internal team (GC/owner/compliance staff) what the risk is, what is missing, and what should happen next.

Do not include JSON comments. Do not wrap JSON in markdown. JSON only.

Vendor:
${JSON.stringify(
  {
    id: vendor.id,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
  },
  null,
  2
)}

Policies:
${JSON.stringify(policies, null, 2)}

Compliance Summary:
${JSON.stringify(
  {
    summary,
    missing,
    failing,
    passing,
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
            "You are an AI assistant helping a construction/general contractor compliance team manage vendor insurance risk.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      console.error("Fix-plan JSON parse error:", err);
      parsed = {
        steps: [
          "Review vendor coverage against requirements.",
          "Request updated COI to cure missing or failing coverage.",
          "Re-run compliance after updated documents are received.",
        ],
        vendorEmailSubject: "Request for updated COI",
        vendorEmailBody:
          "Please provide an updated Certificate of Insurance that meets our requirements.",
        internalNotes:
          "AI output could not be parsed as JSON. Using fallback generic plan.",
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
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Fix plan generation failed" });
  } finally {
    try {
      await db?.end();
    } catch (_) {}
  }
}
