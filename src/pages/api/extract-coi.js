// src/pages/api/extract-coi.js
import OpenAI from "openai";
import { Client } from "pg";
import { extractText } from "@/lib/server/pdfExtract";

export const config = { api: { bodyParser: false } }; // Node runtime only

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ ok: false, error: "Method not allowed" });

    const chunks = [];
    for await (const c of req) chunks.push(c);
    const buffer = Buffer.concat(chunks);

    if (!buffer.length)
      return res.status(400).json({ ok: false, error: "No file uploaded" });

    // ✅ pure Node PDF parsing — no DOMMatrix possible
    const text = await extractText(buffer);
    if (!text) return res.status(422).json({ ok: false, error: "Empty PDF" });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Extract these fields from the COI text as JSON:
    carrier, policy_number, effective_date, expiration_date, coverage_type
    ---
    ${text.slice(0, 4000)}
    ---`;

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const raw = result.choices?.[0]?.message?.content || "{}";
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    await db.query(
      `INSERT INTO public.policies (policy_number, carrier, effective_date, expiration_date, coverage_type, status)
       VALUES ($1,$2,$3,$4,$5,'active') ON CONFLICT DO NOTHING`,
      [
        json.policy_number,
        json.carrier,
        json.effective_date,
        json.expiration_date,
        json.coverage_type,
      ]
    );
    await db.end();

    res.status(200).json({ ok: true, message: "Extraction complete", json });
  } catch (e) {
    console.error(e);
    res
      .status(500)
      .json({ ok: false, error: e.message || "Unexpected server error" });
  }
}
