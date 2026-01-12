// pages/api/docs/extract-contract.js
// =============================================================
// MULTI-DOCUMENT INTELLIGENCE V2 — STEP 3
// CONTRACT INTELLIGENCE ENGINE
// =============================================================

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { supabaseServer } from "@/lib/supabaseServer";
import { openai } from "@/lib/openaiClient";
import { sql } from "@db";

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
        error: "Only PDF files accepted for contract extraction.",
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
    const path = `contracts/${orgId || "no-org"}/vendors/${
      vendorId || "no-vendor"
    }/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, buffer, {
        contentType: "application/pdf",
      });

    if (uploadError) throw new Error("Supabase upload failed.");

    const { data: pub } = supabase.storage
      .from("uploads")
      .getPublicUrl(path);

    fileUrl = pub?.publicUrl || null;

    // =========================================================
    // 2️⃣ EXTRACT TEXT
    // =========================================================
    const pdfData = await pdfParse(buffer);
    if (!pdfData.text || !pdfData.text.trim()) {
      throw new Error("Contract PDF has no extractable text.");
    }

    const text = pdfData.text.slice(0, 25000);

    // =========================================================
    // 3️⃣ AI CONTRACT INTELLIGENCE PROMPT
    // =========================================================
    const prompt = `
You are an insurance and contracts compliance expert.

You will be given the OCR text of a contract or master service agreement.

Return ONLY valid JSON in the EXACT shape previously defined.

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
    // 4️⃣ Log timeline event
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
    // 5️⃣ RETURN RESULT
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
