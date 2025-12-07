// pages/api/docs/extract-contract.js
// =============================================================
// MULTI-DOCUMENT INTELLIGENCE V2 — STEP 3
// CONTRACT INTELLIGENCE ENGINE
//
// Accepts a contract / agreement PDF and extracts a structured
// insurance requirements profile, including:
//
// - Required coverages (GL, Auto, WC, Umbrella, ProfLiab)
// - Limits (each occurrence, aggregate, etc.)
// - Required endorsements (CG 20 10, CG 20 37, AI, Waiver, P&NC, etc.)
// - Raw insurance requirements clause text
// - Raw indemnity clause text
// - Notes / special conditions
//
// Returns:
// {
//   ok: true,
//   fileUrl,
//   vendorId,
//   orgId,
//   requirementsProfile: { ... },
//   rawClauses: {
//     insuranceRequirements: "...",
//     indemnity: "...",
//     waiverOfSubrogation: "...",
//     additionalInsured: "..."
//   },
//   confidence,
//   reason
// }
// =============================================================

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { supabase } from "../../../lib/supabaseClient";
import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = { api: { bodyParser: false } };

// Parse multipart form-data
function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ ok: false, error: "Use POST." });
    }

    const { fields, files } = await parseForm(req);

    const file =
      files.file?.[0] ||
      files.document?.[0] ||
      files.file ||
      files.document;

    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded." });
    }

    if (!file.originalFilename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({
        ok: false,
        error: "Only PDF files accepted for contract extraction.",
      });
    }

    const vendorId =
      fields.vendorId?.[0] || fields.vendor_id?.[0] || null;
    const orgId =
      fields.orgId?.[0] || fields.org_id?.[0] || null;

    // =========================================================
    // 1️⃣ READ PDF + UPLOAD TO SUPABASE (optional but recommended)
    // =========================================================
    const buffer = fs.readFileSync(file.filepath);

    let fileUrl = null;
    if (supabase) {
      const safeName = file.originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `contracts/${orgId || "no-org"}/vendors/${
        vendorId || "no-vendor"
      }/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, buffer, {
          contentType: "application/pdf",
        });

      if (error) throw new Error("Supabase upload failed.");

      const { data: pub } = supabase.storage
        .from("uploads")
        .getPublicUrl(path);

      fileUrl = pub?.publicUrl || null;
    }

    // =========================================================
    // 2️⃣ EXTRACT TEXT
    // =========================================================
    const pdfData = await pdfParse(buffer);
    if (!pdfData.text || !pdfData.text.trim()) {
      throw new Error("Contract PDF has no extractable text.");
    }

    const text = pdfData.text.slice(0, 25000); // keep within token limits

    // =========================================================
    // 3️⃣ AI CONTRACT INTELLIGENCE PROMPT
    // =========================================================
    const prompt = `
You are an insurance and contracts compliance expert.

You will be given the OCR text of a contract or master service agreement between a "Owner" or "Client" and a "Contractor" or "Vendor".

Your job is to extract the INSURANCE REQUIREMENTS and related clauses in a structured format that can be applied to a vendor's insurance requirements profile.

Return ONLY valid JSON in this EXACT shape:

{
  "requirementsProfile": {
    "version": "contract-v1",
    "coverages": {
      "generalLiability": {
        "required": boolean,
        "eachOccurrenceLimit": number|null,
        "generalAggregateLimit": number|null,
        "productsCompletedOpsAggregate": number|null,
        "perProjectAggregate": boolean,
        "perLocationAggregate": boolean,
        "description": "string|null"
      },
      "autoLiability": {
        "required": boolean,
        "combinedSingleLimit": number|null,
        "anyAuto": boolean|null,
        "hiredNonOwned": boolean|null,
        "description": "string|null"
      },
      "workersComp": {
        "required": boolean,
        "employersLiabilityEachAccident": number|null,
        "employersLiabilityDiseasePolicyLimit": number|null,
        "employersLiabilityDiseaseEachEmployee": number|null,
        "waiverOfSubrogationRequired": boolean|null,
        "description": "string|null"
      },
      "umbrella": {
        "required": boolean,
        "limit": number|null,
        "followsForm": boolean|null,
        "description": "string|null"
      },
      "professionalLiability": {
        "required": boolean,
        "eachClaim": number|null,
        "aggregate": number|null,
        "retroactiveDateRequired": boolean|null,
        "tailCoverageRequiredYears": number|null,
        "description": "string|null"
      }
    },
    "requiredEndorsements": [
      "CG 20 10",
      "CG 20 37",
      "Waiver of Subrogation",
      "Primary & Noncontributory",
      "Per Project Aggregate",
      "Per Location Aggregate"
    ],
    "additionalInsuredRequired": boolean,
    "waiverOfSubrogationRequired": boolean,
    "primaryNonContributoryRequired": boolean,
    "otherInsuranceLanguage": "string|null",
    "specialConditions": [
      "string"
    ],
    "notes": "string|null"
  },
  "rawClauses": {
    "insuranceRequirements": "full clause text or null",
    "indemnity": "full indemnity clause text or null",
    "waiverOfSubrogation": "relevant text or null",
    "additionalInsured": "relevant text or null"
  },
  "confidence": number between 0 and 1,
  "reason": "short explanation of how reliable this extraction is"
}

Rules:
- Do NOT invent coverage if not explicitly required. If unclear, set required=false.
- Convert dollar amounts to simple numeric values (e.g. 1000000 for $1,000,000).
- Only include endorsement codes that are strongly indicated by the text (CG 20 10, CG 20 37, etc.).
- If the contract uses narrative instead of ISO codes, infer the endorsement type (e.g. "primary and noncontributory", "waiver of subrogation", etc.).
- Return ONLY the JSON block, nothing else.

Here is the contract text:

${text}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.1,
      messages: [
        { role: "system", content: "Return ONLY the JSON described, no commentary." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message?.content?.trim() || "{}";
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1) {
      throw new Error("AI did not return JSON.");
    }

    const parsed = JSON.parse(raw.slice(first, last + 1));

    const requirementsProfile = parsed.requirementsProfile || null;
    const rawClauses = parsed.rawClauses || {
      insuranceRequirements: null,
      indemnity: null,
      waiverOfSubrogation: null,
      additionalInsured: null,
    };
    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : null;
    const reason = parsed.reason || "";

    // =========================================================
    // 4️⃣ Optional: log a timeline event for this extraction
    //    (we DO NOT auto-overwrite vendor requirements yet)
    // =========================================================
    if (vendorId && orgId) {
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId},
          ${vendorId},
          'contract_requirements_extracted',
          'Contract insurance requirements extracted into a profile (contract-v1).',
          'info'
        );
      `;
    }

    // =========================================================
    // 5️⃣ RETURN RESULT — let UI decide to apply to vendor
    // =========================================================
    return res.status(200).json({
      ok: true,
      fileUrl,
      vendorId,
      orgId,
      requirementsProfile,
      rawClauses,
      confidence,
      reason,
    });
  } catch (err) {
    console.error("[Contract Extract ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal contract extraction error.",
    });
  }
}
