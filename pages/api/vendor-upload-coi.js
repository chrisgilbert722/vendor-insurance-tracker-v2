export const config = {
  runtime: "nodejs",
  api: { bodyParser: false },
};

import OpenAI from "openai";
import { Client } from "pg";
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let client = null;

  try {
    // Parse form-data (file + token)
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    const token =
      fields.token?.[0] ||
      fields.token ||
      fields.vendorToken?.[0] ||
      fields.vendorToken ||
      null;

    if (!token) {
      throw new Error("Missing vendor upload token");
    }

    // Connect to DB
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // Validate vendor token
    const vendorResult = await client.query(
      `SELECT id, name, org_id
       FROM vendors
       WHERE upload_token = $1
         AND (upload_token_expires_at IS NULL OR upload_token_expires_at > NOW())
       LIMIT 1`,
      [token]
    );

    if (vendorResult.rowCount === 0) {
      throw new Error("Invalid or expired upload link");
    }

    const vendor = vendorResult.rows[0];
    const orgId = vendor.org_id || 1;

    // Read + parse PDF
    const buffer = fs.readFileSync(file.filepath);
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("PDF contains no readable text");
    }

    const text = pdfData.text.trim().slice(0, 5000);

    // OpenAI extraction
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `
You are a COI (Certificate of Insurance) parser.
Your job is to extract ONLY the following fields:

{
  "vendor_name": string | null,
  "policy_number": string | null,
  "carrier": string | null,
  "effective_date": string | null,
  "expiration_date": string | null,
  "coverage_type": string | null
}

"vendor_name" should be the insured party or named insured on the certificate
(e.g. "Beachside Construction LLC", "Chris Gilbert", etc.)

Rules:
- Return ONLY valid JSON.
- No explanations.
- If a field is missing, set it to null.
`;

    const userPrompt = `Extract these fields from the PDF text:\n\n${text}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const aiOutput = completion.choices[0]?.message?.content || "";
    const jsonMatch = aiOutput.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error("AI did not return valid JSON");

    let jsonData;
    try {
      jsonData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error("Failed to parse JSON from AI output");
    }

    // Prefer the vendor.name from DB as the canonical name
    const finalVendorName = vendor.name || jsonData.vendor_name || null;

    // Insert into documents table (for multi-doc support)
    const docResult = await client.query(
      `INSERT INTO documents
        (vendor_id, org_id, document_type, file_url, raw_text, ai_json, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'processed')
       RETURNING id`,
      [
        vendor.id,
        orgId,
        "COI",
        null, // file_url (we'll add storage later)
        pdfData.text.trim().slice(0, 10000),
        JSON.stringify(jsonData),
      ]
    );

    const documentId = docResult.rows[0].id;

    // Insert into policies table
    await client.query(
      `INSERT INTO public.policies
        (vendor_id, org_id, vendor_name, policy_number, carrier, effective_date, expiration_date, coverage_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [
        vendor.id,
        orgId,
        finalVendorName,
        jsonData.policy_number || null,
        jsonData.carrier || null,
        jsonData.effective_date || null,
        jsonData.expiration_date || null,
        jsonData.coverage_type || null,
      ]
    );

    await client.end();

    return res.status(200).json({
      ok: true,
      json: { ...jsonData, vendor_name: finalVendorName },
      documentId,
      message: "Vendor COI uploaded and extracted successfully",
    });
  } catch (err) {
    console.error("vendor-upload-coi ERROR:", err);
    if (client) {
      try {
        await client.end();
      } catch (_) {}
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
