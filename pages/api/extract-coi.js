// 🟢 FINAL — Vercel Node.js API Route (Stable + JSON-Safe + Production Ready)

export const config = {
  runtime: "nodejs",
  api: { bodyParser: false }, // Required for formidable to handle PDF uploads
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
    // 🟢 Parse form-data (file upload)
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    // 🟢 Read PDF buffer
    const buffer = fs.readFileSync(file.filepath);
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("PDF contains no readable text");
    }

    // 🟢 Limit size to avoid sending huge PDFs to OpenAI
    const text = pdfData.text.trim().slice(0, 5000);

    // 🟢 OpenAI client
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
        { role: "user", content: userPrompt }
      ],
    });

    const aiOutput = completion.choices[0]?.message?.content || "";

    // 🟢 Extract ONLY the JSON portion
    const jsonMatch = aiOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI did not return valid JSON");

    let jsonData;
    try {
      jsonData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error("Failed to parse JSON from AI output");
    }

    // 🟢 Insert into PostgreSQL
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    await client.query(
      `INSERT INTO public.policies
        (vendor_name, policy_number, carrier, effective_date, expiration_date, coverage_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [
        jsonData.vendor_name || null,
        jsonData.policy_number || null,
        jsonData.carrier || null,
        jsonData.effective_date || null,
        jsonData.expiration_date || null,
        jsonData.coverage_type || null
      ]
    );

    await client.end();

    return res.status(200).json({
      ok: true,
      json: jsonData,
      message: "COI extracted successfully",
    });

  } catch (err) {
    console.error("extract-coi.js ERROR:", err);

    if (client) {
      try {
        await client.end();
      } catch (_) {}
    }

    return res.status(500).json({ ok: false, error: err.message });
  }
}


    return res.status(500).json({ ok: false, error: err.message });
  }
}
