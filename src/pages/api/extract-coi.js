// src/pages/api/extract-coi.js
const OpenAI = require("openai");
const { Client } = require("pg");
const { extractText } = require("@/lib/server/pdfExtract");

// ✅ Force Node runtime, disable body parsing
export const config = {
  runtime: "nodejs18.x",
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    // ✅ Read raw stream into Buffer
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const buffer = Buffer.concat(chunks);

    if (!buffer.length) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    // ✅ Parse PDF text on the server
    const text = await extractText(buffer);
    if (!text?.trim()) {
      return res.status(422).json({ ok: false, error: "Empty or unreadable PDF" });
    }

    // ✅ Send content to OpenAI for structured extraction
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `
Extract fields from this certificate of insurance text into JSON with these keys:
carrier, policy_number, effective_date, expiration_date, coverage_type.
Return ONLY JSON.
---
${text.slice(0, 4000)}
---
`;

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const raw = ai.choices?.[0]?.message?.content || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};

    // ✅ Save parsed data into your Neon database
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    await db.query(
      `INSERT INTO public.policies 
       (policy_number, carrier, effective_date, expiration_date, coverage_type, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (policy_number) DO NOTHING`,
      [
        parsed.policy_number || null,
        parsed.carrier || null,
        parsed.effective_date || null,
        parsed.expiration_date || null,
        parsed.coverage_type || null,
      ]
    );

    await db.end();

    return res.status(200).json({
      ok: true,
      message: "✅ Extraction complete",
      json: parsed,
    });
  } catch (e) {
    console.error("❌ extract-coi error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e.message || "Unexpected server error" });
  }
}
