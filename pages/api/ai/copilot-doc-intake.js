// pages/api/ai/copilot-doc-intake.js

import OpenAI from "openai";
import { sql } from "../../../lib/db";
import formidable from "formidable";
import fs from "fs";
import crypto from "crypto";
import { runRulesOnExtractedDocument } from "../../../lib/ruleEngineV6";

export const config = {
  api: { bodyParser: false }, // required for file uploads
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Create a quick hash so Copilot can detect repeated/similar docs.
 */
function hashBuffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/* ============================================================
   MAIN HANDLER — UACC Document Intake + Rule Engine V6
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const orgId = Number(fields.orgId || 0);
    const vendorId = fields.vendorId ? Number(fields.vendorId) : null;
    const policyId = fields.policyId ? Number(fields.policyId) : null;

    if (!files.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded." });
    }

    const uploaded = files.file[0];
    const buffer = fs.readFileSync(uploaded.filepath);
    const hash = hashBuffer(buffer);

    /* ============================================================
       PHASE 1 — Document Understanding (AI)
    ============================================================= */
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are the UACC Document Intelligence Engine.

Your goals:

1. Identify EXACT document type:
   - COI / Acord 25
   - Endorsement (e.g., CG 20 10, CG 20 37, CG 24 04)
   - Binder
   - Auto policy / WC / Umbrella / Excess
   - W9
   - Business License
   - Contract / MSA
   - Safety Manual
   - Insurance Schedule
   - Invoices or irrelevant documents

2. Extract JSON in this EXACT structure:

{
  "document_type": "...",
  "coverage": { ... },
  "endorsements": [ ... ],
  "limits": { ... },
  "entities": {
    "insured": "...",
    "carrier": "...",
    "certificate_holder": "...",
    "producer": "..."
  },
  "dates": {
    "effective": "...",
    "expiration": "..."
  },
  "contract_obligations": [ ... ],
  "safety_requirements": [ ... ],
  "additional_insured": "...",
  "waiver_of_subrogation": "...",
  "compliance_findings": {
    "good": [ ... ],
    "bad": [ ... ],
    "unknown": [ ... ]
  },
  "missing": [ ... ],
  "risk_flags": [ ... ],
  "raw_text_excerpt": "..."
}

3. After JSON, provide a human explanation of the key points.

Be precise, avoid hallucination. If unknown, say unknown.
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

    const rawText = completion.choices[0].message.content || "";
    let extracted;

    // ============================================================
    // JSON Extraction (Improved & Safer)
    // ============================================================
    try {
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      const jsonChunk = rawText.slice(jsonStart, jsonEnd + 1);

      try {
        extracted = JSON.parse(jsonChunk);
      } catch (innerErr) {
        // Attempt second-chance parse (strip backticks, weird formatting)
        extracted = JSON.parse(
          jsonChunk
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim()
        );
      }
    } catch (err) {
      console.error("JSON parse failed fully:", err);
      extracted = {
        document_type: "unknown",
        error: "JSON parse failed",
        raw_output: rawText,
      };
    }

    /* ============================================================
       PHASE 2 — Save Document Intelligence into Copilot Memory
    ============================================================= */
    if (orgId) {
      await sql`
        INSERT INTO copilot_memory (
          org_id,
          vendor_id,
          policy_id,
          role,
          message,
          memory
        )
        VALUES (
          ${orgId},
          ${vendorId},
          ${policyId},
          'document',
          ${"Document processed via UACC doc-intake"},
          ${{
            extracted,
            doc_hash: hash,
            filename: uploaded.originalFilename,
            ts: new Date().toISOString(),
          }}
        );
      `;
    }

    /* ============================================================
       PHASE 3 — Rule Engine V6 Auto-Match
       (Docs → Rules → Compliance + Alerts)
    ============================================================= */
    let ruleEngineResult = null;

    if (orgId && vendorId) {
      ruleEngineResult = await runRulesOnExtractedDocument({
        orgId,
        vendorId,
        policyId,
        extracted,
      });
    }

    /* ============================================================
       PHASE 4 — OPTIONAL: Broker COI Auto-Checker Trigger Hook
       We simply return extracted + ruleEngineResult for UI decision.
    ============================================================= */

    return res.status(200).json({
      ok: true,
      extracted,
      raw: rawText,
      ruleEngineResult,
      docHash: hash,
      filename: uploaded.originalFilename,
    });
  } catch (err) {
    console.error("UACC Document Intake ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
