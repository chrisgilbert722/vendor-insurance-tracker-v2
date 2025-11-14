// ✅ Final Clean Node-only Extract COI API (Safe Version)
import OpenAI from "openai";
import { Client } from "pg";
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

// Required so Vercel uses Node runtime
export const config = {
  api: { bodyParser: false, runtime: "nodejs" }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 🧠 Parse form data safely
    const form = formidable({});
    const [fields, files] = await form.parse(req).catch(() => {
      throw new Error("Failed to parse uploaded form data");
    });

    const file = files.file?.[0];
    if (!file) throw new Error("No file uploaded");

    // 📄 Convert uploaded file → Buffer
    let buffer;
    try {
      buffer = fs.readFileSync(file.filepath);
    } catch (e) {
      throw new Error("Failed to read uploaded file");
    }

    // 📄 Extract PDF text
    const pdfData = await pdfParse(buffer).catch(() => {
      throw new Error("Failed to parse PDF");
    });

    const text = pdfData.text?.trim();
    if (!text) throw new Error("PDF contained no readable text");

    // 🧠 OpenAI extraction
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
Extract insurance details from this COI text as JSON with keys:
policy_number, carrier, effective_date, expiration_date, coverage_type.
Return JSON only.
----
${text.slice(0, 4000)}
----
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt }
      ]
    }).catch(() => {
      throw new Error("OpenAI API request failed");
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    if (!raw) throw new Error("OpenAI returned empty result");

    // Ensure JSON only
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("OpenAI did not return JSON");

    let jsonData = {};
    try {
      jsonData = JSON.parse(match[0]);
    } catch (e) {
      throw new Error("Failed to parse JSON from OpenAI");
    }

    // 💾 Insert into PostgreSQL
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    await client.connect().catch(() => {
      throw new Error("Database connection failed");
    });

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
    ).catch(err => {
      console.error("DB Insert Error:", err);
      throw new Error("Database insert failed");
    });

    await client.end();

    // 🎉 Success
    return res.status(200).json({
      ok: true,
      message: "COI extracted and stored successfully",
      json: jsonData
    });

  } catch (err) {
    console.error("extract-coi ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Unknown error occurred"
    });
  }
}
 
