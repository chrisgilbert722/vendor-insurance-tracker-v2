// pages/api/ai/copilot-doc-intake.js

import OpenAI from "openai";
import { sql } from "../../../lib/db";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // required for file uploads
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ============================================================
   MAIN HANDLER — UACC Document Intake
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use POST." });
  }

  try {
    // Parse form-data
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const orgId = Number(fields.orgId || 0);
    const vendorId = Number(fields.vendorId || null);
    const policyId = Number(fields.policyId || null);

    if (!files.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded." });
    }

    const uploaded = files.file[0];
    const buffer = fs.readFileSync(uploaded.filepath);

    /* ============================================================
       PHASE 1 — Extract Raw Text + Meaning
    ============================================================ */
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are the UACC Document Intelligence Engine.
Your goals:

1. Identify document type:
   - COI (Acord 25)
   - W9
   - Business License
   - Contract / MSA
   - Safety Manual
   - Insurance Endorsement (CG 20 10, CG 20 37, etc.)
   - Workers Comp forms
   - Auto policy
   - Umbrella / Excess
   - Invoices or irrelevant docs

2. Extract structured information as JSON:
   - coverage
   - limits
   - endorsements
   - policy numbers
   - carriers
   - effective/expiration dates
   - named insureds
   - certificate holder
   - additional insured status
   - waiver of subrogation
   - contract clauses
   - obligations
   - safety requirements
   - missing items
   - high-risk issues
   - renewal implications

3. Provide a natural-language explanation afterward.

4. DO NOT hallucinate — if unsure, mark as "unknown."

Return this exact shape:

{
  "document_type": "...",
  "coverage": { ... },
  "endorsements": [ ... ],
  "limits": { ... },
  "entities": {
    "insured": "...",
    "carrier": "...",
    "certificate_holder": "..."
  },
  "dates": {
    "effective": "...",
    "expiration": "..."
  },
  "contract_obligations": [ ... ],
  "safety_requirements": [ ... ],
  "missing": [ ... ],
  "risk_flags": [ ... ],
  "raw_text_excerpt": "..."
}

After JSON return a CLEAR explanation for humans.
`,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze this document and extract all structurable information.",
            },
            {
              type: "input_file",
              file: buffer.toString("base64"),
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    const resultText = completion.choices[0].message.content;
    let extracted;

    // Try to parse the JSON block
    try {
      const jsonStart = resultText.indexOf("{");
      const jsonEnd = resultText.lastIndexOf("}");
      const jsonChunk = resultText.slice(jsonStart, jsonEnd + 1);
      extracted = JSON.parse(jsonChunk);
    } catch (err) {
      extracted = { document_type: "unknown", error: "JSON parse failed", raw: resultText };
    }

    /* ============================================================
       PHASE 2 — Store in UACC Memory Engine
    ============================================================ */
    if (orgId) {
      await sql`
        INSERT INTO copilot_memory (org_id, vendor_id, policy_id, role, message, memory)
        VALUES (
          ${orgId},
          ${vendorId},
          ${policyId},
          'document',
          'Document processed via UACC Document Engine',
          ${{
            extracted,
            filename: uploaded.originalFilename,
            ts: new Date().toISOString(),
          }}
        );
      `;
    }

    /* ============================================================
       RETURN RESULT
    ============================================================ */
    return res.status(200).json({
      ok: true,
      extracted,
      raw: resultText,
    });
  } catch (err) {
    console.error("UACC Document Intake ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
