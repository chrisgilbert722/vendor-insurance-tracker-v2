// ✅ Final Clean Node-only Extract COI API

export const config = {
  api: { bodyParser: false },
  runtime: "nodejs",       // ⬅️ REQUIRED so Vercel runs this in Node.js, not Edge
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
    // 🧠 Parse form data to get uploaded file
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    // ✅ Convert uploaded file to Buffer
    const buffer = fs.readFileSync(file.filepath);

    // 🧾 Parse PDF text (Node-only)
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text?.trim();
    if (!text) throw new Error("Empty PDF text");

    // 🧠 Extract structured data using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Extract insurance details from this COI text as JSON with keys:
    policy_number, carrier, effective_date, expiration_date, coverage_type. 
    Return JSON only.
    ----
    ${text.slice(0, 4000)}
    ----`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonData = match ? JSON.parse(match[0]) : {};

    // 💾 Store in PostgreSQL
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(
      `INSERT INTO public.policies (policy_number, carrier, effective_date, expiration_date, coverage_type, status)
       VALUES ($1,$2,$3,$4,$5,'active')`,
      [
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
      message: "✅ COI extracted and stored successfully",
      json: jsonData,
    });

  } catch (err) {
    console.error("extract-coi error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
