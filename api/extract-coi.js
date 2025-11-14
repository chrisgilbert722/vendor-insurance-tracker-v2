// ✅ FINAL — Node.js Server Function (Vercel Compatible)

export const config = {
  api: {
    bodyParser: false,   // Must be false for formidable
    runtime: "nodejs"    // Force Node, NOT Edge
  },
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

  try {
    // 🧩 Parse form-data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    // Read PDF file buffer
    const buffer = fs.readFileSync(file.filepath);
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text) throw new Error("Could not read PDF text");

    const text = pdfData.text.trim().slice(0, 3500);

    // 🧠 Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
Extract the following fields from this Certificate of Insurance:

- policy_number
- carrier
- effective_date
- expiration_date
- coverage_type

Return ONLY valid JSON. No commentary.

PDF TEXT:
${text}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return ONLY a valid JSON object." },
        { role: "user", content: prompt }
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";

    // Extract ONLY JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI did not return JSON");

    const jsonData = JSON.parse(match[0]);

    // 💾 Insert into PostgreSQL
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    await client.query(
      `INSERT INTO public.policies
      (policy_number, carrier, effective_date, expiration_date, coverage_type, status)
      VALUES ($1,$2,$3,$4,$5,'active')`,
      [
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
      message: "COI extracted successfully"
    });

  } catch (err) {
    console.error("extract-coi.js ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
