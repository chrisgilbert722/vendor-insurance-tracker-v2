// ✅ Final — Vercel Node Runtime API (no Edge runtime)
export const config = {
  api: { bodyParser: false },
  runtime: "nodejs18.x",
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
    // 🧠 Parse file upload
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    // Read uploaded PDF
    const buffer = fs.readFileSync(file.filepath);
    const pdfData = await pdfParse(buffer);

    const text = pdfData.text?.trim();
    if (!text) throw new Error("PDF text not readable");

    // 🧠 OpenAI JSON extraction
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Extract insurance data from this COI as JSON:
Return ONLY JSON.
Fields:
- policy_number
- carrier
- effective_date
- expiration_date
- coverage_type

Text:
${text.slice(0, 4000)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return ONLY valid JSON. No text outside JSON." },
        { role: "user", content: prompt }
      ]
    });

    // Extract JSON safely
    const content = completion.choices[0]?.message?.content || "{}";
    const match = content.match(/\{[\s\S]*\}/);
    const jsonData = match ? JSON.parse(match[0]) : {};

    // 🗄 Save to PostgreSQL
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
      message: "COI extracted + saved",
      json: jsonData,
    });

  } catch (err) {
    console.error("extract-coi ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Unknown error"
    });
  }
}
