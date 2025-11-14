// Final Clean Node-only Extract COI API

export const config = {
  api: { bodyParser: false },
  runtime: "nodejs"   // ✅ Required so we do NOT run on Edge
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
    // 🧩 Parse file upload
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    // 📄 Read PDF into Buffer
    const buffer = fs.readFileSync(file.filepath);

    // 🔍 Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text?.trim() || "";

    if (!text.length) {
      return res.status(400).json({ ok: false, error: "PDF text is empty" });
    }

    // 🤖 Extract structured data using OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return ONLY valid JSON." },
        {
          role: "user",
          content: `Extract insurance details as JSON with keys:
          policy_number, carrier, effective_date, expiration_date, coverage_type.
          
          Text:
          ${text.slice(0, 4000)}`
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonData = match ? JSON.parse(match[0]) : {};

    // 🗃 Save results to PostgreSQL
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    await client.query(
      `INSERT INTO public.policies
      (policy_number, carrier, effective_date, expiration_date, coverage_type, status)
      VALUES ($1, $2, $3, $4, $5, 'active')`,
      [
        jsonData.policy_number || null,
        jsonData.carrier || null,
        jsonData.effective_date || null,
        jsonData.expiration_date || null,
        jsonData.coverage_type || null,
      ]
    );
    await client.end();

    // 🎉 Success response
    return res.status(200).json({
      ok: true,
      message: "COI extracted successfully",
      json: jsonData
    });

  } catch (err) {
    console.error("❌ extract-coi error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Unknown error"
    });
  }
}
