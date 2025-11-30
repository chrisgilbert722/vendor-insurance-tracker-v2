// pages/api/ai/vendor-fix.js
// Unified AI Compliance Core (UACC) — Vendor Fix Mode

import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ============================================================
   LOAD CONTEXT FOR VENDOR FIX MODE
============================================================ */
async function buildVendorFixContext({ orgId, vendorId, policyId }) {
  const ctx = { orgId };

  // vendor
  const vendorRows = await sql`
    SELECT *
    FROM vendors
    WHERE id = ${vendorId}
    LIMIT 1;
  `;
  ctx.vendor = vendorRows[0] || null;

  // policy
  if (policyId) {
    const policyRows = await sql`
      SELECT *
      FROM policies
      WHERE id = ${policyId}
      LIMIT 1;
    `;
    ctx.policy = policyRows[0] || null;
  }

  // compliance cache (failing rules!)
  const comp = await sql`
    SELECT *
    FROM vendor_compliance_cache
    WHERE org_id = ${orgId}
      AND vendor_id = ${vendorId}
    LIMIT 1;
  `;
  ctx.compliance = comp[0] || null;

  // recent COI / doc memory
  const doc = await sql`
    SELECT memory
    FROM copilot_memory
    WHERE org_id = ${orgId}
      AND vendor_id = ${vendorId}
      AND role = 'document'
    ORDER BY created_at DESC
    LIMIT 1;
  `;
  ctx.document = doc[0]?.memory || null;

  // alerts for vendor
  const alerts = await sql`
    SELECT *
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND vendor_id = ${vendorId}
    ORDER BY created_at DESC
    LIMIT 20;
  `;
  ctx.alerts = alerts || [];

  return ctx;
}

/* ============================================================
   FORMAT FIX STEPS FOR UI
============================================================ */
function createFixStepsStructure() {
  return `
Return your answer in this EXACT JSON format:

{
  "plain_english_summary": "...",
  "why_non_compliant": [ "..." ],
  "fix_steps": [
    {
      "title": "...",
      "step_by_step": [
        "Step 1 ...",
        "Step 2 ...",
        "Step 3 ... (upload new COI)"
      ]
    }
  ],
  "upload_requirements": [
    "Upload a COI with GL Each Occurrence >= 1,000,000",
    "Upload endorsement CG 20 10 04/13",
    "Add Waiver of Subrogation on WC"
  ],
  "sample_broker_email": "..."
}

AFTER the JSON, include a friendly human explanation for the vendor.
`;
}

/* ============================================================
   MAIN HANDLER — Vendor Fix Mode
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST" });
  }

  try {
    const { orgId, vendorId, policyId } = req.body;

    if (!orgId || !vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or vendorId",
      });
    }

    // LOAD CONTEXT
    const context = await buildVendorFixContext({
      orgId,
      vendorId,
      policyId,
    });

    const systemPrompt = `
You are "Vendor Fix Mode" — an AI assistant that helps vendors FIX their compliance issues step-by-step.

The vendor does NOT understand insurance.
You must:
- Break everything down into VERY SIMPLE English.
- Explain EXACTLY what is wrong.
- Show EXACTLY how to fix it.
- Generate a broker email they can copy/paste.
- Tell them EXACTLY what to upload next.
- Keep your tone friendly, patient, and clear.

Here is the context:
${JSON.stringify(context, null, 2)}

${createFixStepsStructure()}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o", // strong reasoning for vendor coaching
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Please generate the vendor fix steps." },
      ],
      temperature: 0.15,
    });

    const text = completion.choices[0].message.content || "";

    let parsed;
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonChunk = text.slice(jsonStart, jsonEnd + 1);
      parsed = JSON.parse(
        jsonChunk.replace(/```json/gi, "").replace(/```/g, "")
      );
    } catch (err) {
      console.error("Vendor Fix JSON parse failed:", err);
      parsed = {
        plain_english_summary:
          "We could not parse the JSON correctly. See raw output.",
        fix_steps: [],
        why_non_compliant: [],
        upload_requirements: [],
        sample_broker_email: "",
      };
    }

    return res.status(200).json({
      ok: true,
      fixMode: parsed,
      raw: text,
      context,
    });
  } catch (err) {
    console.error("[vendor-fix] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
