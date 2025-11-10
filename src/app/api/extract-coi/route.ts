import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";
import parsePdf from "pdf-parse"; // direct import works fine in Node

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    // Convert PDF → text
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await parsePdf(buffer);
    const text = pdfData.text?.trim() || "";

    if (!text) {
      return NextResponse.json({ ok: false, error: "Empty or unreadable PDF" }, { status: 400 });
    }

    // Ask OpenAI to extract key insurance fields
    const prompt = `
Extract the following from this Certificate of Insurance text:
- Carrier (insurance company name)
- Policy Number
- Expiration Date

Return results in JSON format with keys: carrier, policyNumber, expirationDate.

Certificate Text:
"""${text.slice(0, 4000)}"""
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const content = completion.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(content);

    // Optional: save to Neon DB
    const client = new Client({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(
      "INSERT INTO insurance_extracts (carrier, policy_number, expiration_date, created_at) VALUES ($1, $2, $3, NOW())",
      [parsed.carrier, parsed.policyNumber, parsed.expirationDate]
    );
    await client.end();

    return NextResponse.json({
      ok: true,
      extracted: parsed,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Extraction error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Extraction failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi is live — POST a PDF file to extract fields.",
    time: new Date().toISOString(),
  });
}
