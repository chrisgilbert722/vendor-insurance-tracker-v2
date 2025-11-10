import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    // Convert uploaded file to text
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString("utf-8");

    // Ask GPT to extract COI details
    const prompt = `
      You are an insurance document parser.
      Extract key details from this Certificate of Insurance text.
      Return a JSON object with:
      {
        "carrier": "",
        "policy_number": "",
        "expiration_date": "",
        "coverage_type": "",
        "named_insured": ""
      }
      Text:
      """${text}"""
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const raw = completion.choices[0].message?.content || "{}";
    const extracted = JSON.parse(raw);

    // Save extracted data to Neon DB
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    await client.query(
      `CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        carrier TEXT,
        policy_number TEXT,
        expiration_date TEXT,
        coverage_type TEXT,
        named_insured TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )`
    );

    await client.query(
      `INSERT INTO certificates (carrier, policy_number, expiration_date, coverage_type, named_insured)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        extracted.carrier || "Unknown",
        extracted.policy_number || "N/A",
        extracted.expiration_date || "N/A",
        extracted.coverage_type || "N/A",
        extracted.named_insured || "N/A",
      ]
    );

    await client.end();

    return NextResponse.json({ ok: true, extracted }, { status: 200 });
  } catch (err: any) {
    console.error("Error parsing COI:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
