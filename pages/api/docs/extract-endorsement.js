// pages/api/docs/extract-endorsement.js
// =============================================================
// MULTI-DOCUMENT INTELLIGENCE V2 — STEP 2C
// ENDORSEMENT EXTRACTOR (AI, Waiver, Primary/Noncontributory)
// =============================================================

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { supabaseServer } from "../../../lib/supabaseServer";
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

    const supabase = supabaseServer();

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
        error: "Only PDF files accepted.",
      });
    }

    const vendorId =
      fields.vendorId?.[0] || fields.vendor_id?.[0] || null;
    const orgId =
      fields.orgId?.[0] || fields.org_id?.[0] || null;

    // =========================================================
    // 1️⃣ READ PDF + UPLOAD TO SUPABASE
    // =========================================================
    const buffer = fs.readFileSync(file.filepath);

    let fileUrl = null;

    const safeName = file.originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `docs/${orgId || "no-org"}/vendors/${
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

    // =========================================================
    // 2️⃣ EXTRACT TEXT
    // =========================================================
    const pdfData = await pdfParse(buffer);
    if (!pdfData.text || !pdfData.text.trim()) {
      throw new Error("PDF has no extractable text.");
    }

    const text = pdfData.text.slice(0, 20000);

    // =========================================================
    // 3️⃣ RUN AI ENDORSEMENT EXTRACTION
    // =========================================================
    const prompt = `
You are an expert in insurance endorsements. You will extract structured data from the OCR text of an insurance endorsement form.

Here is the OCR text:

${text}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.1,
      messages: [
        { role: "system", content: "Return ONLY the JSON in the schema described." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message?.content?.trim() || "{}";
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1) {
      throw new Error("AI did not return JSON.");
    }

    const extracted = JSON.parse(raw.slice(first, last + 1));

    const data = {
      formNumber: extracted.formNumber || null,
      editionDate: extracted.editionDate || null,
      policyNumber: extracted.policyNumber || null,
      endorsementType: extracted.endorsementType || null,

      additionalInsured: !!extracted.additionalInsured,
      waiverOfSubrogation: !!extracted.waiverOfSubrogation,
      primaryNonContributory: !!extracted.primaryNonContributory,

      ongoingOps: !!extracted.ongoingOps,
      completedOps: !!extracted.completedOps,

      blanket: !!extracted.blanket,
      scheduled: !!extracted.scheduled,

      namedParties: Array.isArray(extracted.namedParties)
        ? extracted.namedParties
        : [],

      appliesToOperations: extracted.appliesToOperations || null,
      appliesToLocations: extracted.appliesToLocations || null,
      appliesToProductsCompletedOps:
        typeof extracted.appliesToProductsCompletedOps === "boolean"
          ? extracted.appliesToProductsCompletedOps
          : null,

      otherNotes: extracted.otherNotes || null,
    };

    const confidence =
      typeof extracted.confidence === "number" ? extracted.confidence : null;
    const reason = extracted.reason || "";

    // =========================================================
    // 4️⃣ OPTIONAL: Compare with vendor.requiredEndorsements
    // =========================================================
    let matchesRequired = { missing: [], satisfied: [] };

    if (vendorId && orgId) {
      const vendorRows = await sql`
        SELECT id, org_id, name AS vendor_name
        FROM vendors
        WHERE id = ${vendorId} AND org_id = ${orgId}
        LIMIT 1;
      `;

      if (vendorRows.length > 0) {
        const vendor = vendorRows[0];
        const req = vendor.requirements_json || {};
        const required = Array.isArray(req.requiredEndorsements)
          ? req.requiredEndorsements
          : [];

        const foundForm =
          (data.formNumber || "").replace(/\s+/g, "").toUpperCase();

        for (const code of required) {
          const normReq = (code || "").replace(/\s+/g, "").toUpperCase();
          if (foundForm && foundForm.includes(normReq)) {
            matchesRequired.satisfied.push(code);
          } else {
            matchesRequired.missing.push(code);
          }
        }

        if (matchesRequired.missing.length > 0) {
          const missingLabel = matchesRequired.missing.join(", ");

          await sql`
            INSERT INTO alerts (
              created_at, is_read, org_id, vendor_id, type,
              message, severity, title, rule_label, status
            ) VALUES (
              NOW(), false, ${orgId}, ${vendorId}, 'Endorsement',
              ${"Missing required endorsement(s): " + missingLabel},
              'High',
              'Missing required endorsements',
              'Endorsement Requirement',
              'Open'
            );
          `;

          await sql`
            INSERT INTO system_timeline (
              org_id, vendor_id, action, message, severity
            ) VALUES (
              ${orgId},
              ${vendorId},
              'endorsement_missing_required',
              ${"Missing required endorsements: " + missingLabel},
              'warning'
            );
          `;
        } else if (required.length > 0 && matchesRequired.satisfied.length > 0) {
          await sql`
            INSERT INTO system_timeline (
              org_id, vendor_id, action, message, severity
            ) VALUES (
              ${orgId},
              ${vendorId},
              'endorsement_requirements_satisfied',
              ${"Required endorsements satisfied: " + matchesRequired.satisfied.join(", ")},
              'info'
            );
          `;
        }
      }
    }

    // =========================================================
    // 5️⃣ RETURN RESPONSE
    // =========================================================
    return res.status(200).json({
      ok: true,
      fileUrl,
      vendorId,
      orgId,
      data,
      matchesRequired,
      confidence,
      reason,
    });

  } catch (err) {
    console.error("[Endorsement Extract ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal endorsement extraction error.",
    });
  }
}
