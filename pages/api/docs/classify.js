// pages/api/docs/classify.js
// ==========================================================
// MULTI-DOCUMENT INTELLIGENCE V2 — STEP 1
// AI Document Classifier
// ==========================================================

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { openai } from "@/lib/openaiClient";
import { supabaseServer } from "@/lib/supabaseServer";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to parse multipart form-data
function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Use POST method." });
  }

  try {
    const supabase = supabaseServer();

    const { fields, files } = await parseForm(req);

    const file =
      files.file?.[0] ||
      files.document?.[0] ||
      files.file ||
      files.document;

    if (!file) {
      return res
        .status(400)
        .json({ ok: false, error: "No file uploaded (expected 'file')." });
    }

    const vendorId =
      fields.vendorId?.[0] ||
      fields.vendor_id?.[0] ||
      fields.vendor?.[0] ||
      null;
    const orgId =
      fields.orgId?.[0] ||
      fields.org_id?.[0] ||
      fields.org?.[0] ||
      null;

    // Validate extension
    if (!file.originalFilename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({
        ok: false,
        error: "Only PDF files are supported for classification.",
      });
    }

    // ==========================================================
    // 1️⃣ Read PDF buffer + upload to Supabase
    // ==========================================================
    const buffer = fs.readFileSync(file.filepath);

    let fileUrl = null;

    const originalName =
      file.originalFilename ||
      file.newFilename ||
      file.filepath.split("/").pop() ||
      "document.pdf";

    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

    const path = `docs/${orgId || "no-org"}/vendors/${
      vendorId || "no-vendor"
    }/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(path, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("[docs/classify] Supabase upload error:", uploadError);
      throw new Error("Supabase upload failed.");
    }

    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(path);

    fileUrl = publicUrlData?.publicUrl || null;

    // ==========================================================
    // 2️⃣ Extract text from PDF (limited for prompt size)
    // ==========================================================
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || !pdfData.text.trim()) {
      throw new Error("Uploaded PDF has no readable text.");
    }

    const textSnippet = pdfData.text.slice(0, 20000);

    // ==========================================================
    // 3️⃣ AI CLASSIFICATION PROMPT
    // ==========================================================
    const prompt = `
You are an insurance/compliance document classifier.

You will be given the OCR text of a single PDF file that may be any of the following:

- Certificate of Insurance (COI)
- W-9 tax form
- Business license
- Insurance endorsement form
- Contract / agreement
- Liability waiver / release
- Safety plan / safety document
- Other / unknown

Return ONLY valid JSON with this shape:

{
  "doc_type": "coi" | "w9" | "business_license" | "endorsement" | "contract" | "waiver" | "safety_document" | "other",
  "subtype": "string or null",
  "confidence": number between 0 and 1,
  "reason": "short explanation (1-3 sentences)"
}

Here is the text:

${textSnippet}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: "Return ONLY valid JSON as specified." },
        { role: "user", content: prompt },
      ],
    });

    let raw = completion.choices[0]?.message?.content?.trim() || "";
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");

    if (first === -1 || last === -1) {
      throw new Error("AI did not return JSON.");
    }

    const parsed = JSON.parse(raw.slice(first, last + 1));

    return res.status(200).json({
      ok: true,
      fileUrl,
      vendorId: vendorId || null,
      orgId: orgId || null,
      docType: parsed.doc_type || "other",
      subtype: parsed.subtype || null,
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : null,
      reason: parsed.reason || "",
    });
  } catch (err) {
    console.error("[docs/classify ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error during document classification.",
    });
  }
}
