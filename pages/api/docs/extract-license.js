// pages/api/docs/extract-license.js
// =============================================================
// MULTI-DOCUMENT INTELLIGENCE V2 — STEP 2B
// BUSINESS LICENSE EXTRACTOR
// =============================================================

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { supabaseServer } from "../../../lib/supabaseServer";
import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = { api: { bodyParser: false } };

// Parse form-data
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
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Use POST." });
  }

  try {
    const supabase = supabaseServer();

    const { fields, files } = await parseForm(req);

    const file =
      files.file?.[0] ||
      files.document?.[0] ||
      files.file ||
      files.document;

    if (!file)
      return res.status(400).json({ ok: false, error: "No file uploaded." });

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

    // =============================================================
    // 1️⃣ READ PDF + UPLOAD TO SUPABASE
    // =============================================================
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

    // =============================================================
    // 2️⃣ EXTRACT PDF TEXT
    // =============================================================
    const pdfData = await pdfParse(buffer);
    if (!pdfData.text) {
      throw new Error("PDF has no extractable text.");
    }

    const text = pdfData.text.slice(0, 20000);

    // =============================================================
    // 3️⃣ RUN AI LICENSE EXTRACTION
    // =============================================================
    const prompt = `
You are extracting business/contractor license information from a PDF.

Return ONLY JSON in this exact shape:

{
  "licenseNumber": "string|null",
  "licenseType": "string|null",
  "licenseClass": "string|null",
  "issuingAuthority": "string|null",
  "issuedDate": "string|null",
  "expirationDate": "string|null",
  "address": "string|null",
  "confidence": number between 0 and 1,
  "reason": "short explanation"
}

Here is the text:

${text}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.1,
      messages: [
        { role: "system", content: "Return ONLY the JSON described." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0].message?.content?.trim() || "";
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");

    if (first === -1 || last === -1)
      throw new Error("AI did not return JSON.");

    const extracted = JSON.parse(raw.slice(first, last + 1));

    const {
      licenseNumber,
      licenseType,
      licenseClass,
      issuingAuthority,
      issuedDate,
      expirationDate,
      address,
      confidence,
      reason,
    } = extracted;

    // =============================================================
    // 4️⃣ DETERMINE EXPIRATION STATUS
    // =============================================================
    let expired = false;
    if (expirationDate) {
      const exp = new Date(expirationDate);
      if (!isNaN(exp) && exp < new Date()) expired = true;
    }

    // =============================================================
    // 5️⃣ OPTIONAL: AUTO-ALERT IF EXPIRED
    // =============================================================
    if (expired && vendorId && orgId) {
      const message = `Business license expired on ${expirationDate}`;

      await sql`
        INSERT INTO alerts
        (created_at, is_read, org_id, vendor_id, type, message, severity, title, rule_label, status)
        VALUES (
          NOW(), false, ${orgId}, ${vendorId}, 'License',
          ${message}, 'High', 'Business License Expired', 'License Expiration', 'Open'
        );
      `;

      await sql`
        INSERT INTO system_timeline
        (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId}, ${vendorId}, 'license_expired', ${message}, 'high'
        );
      `;
    }

    // =============================================================
    // 6️⃣ RETURN CLEAN RESPONSE
    // =============================================================
    return res.status(200).json({
      ok: true,
      fileUrl,
      vendorId,
      orgId,
      data: {
        licenseNumber: licenseNumber || null,
        licenseType: licenseType || null,
        licenseClass: licenseClass || null,
        issuingAuthority: issuingAuthority || null,
        issuedDate: issuedDate || null,
        expirationDate: expirationDate || null,
        address: address || null,
      },
      expired,
      confidence: confidence || null,
      reason: reason || "",
    });

  } catch (err) {
    console.error("[License Extract ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal business license extraction error.",
    });
  }
}
