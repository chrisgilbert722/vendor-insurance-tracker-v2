export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";
import pdfParse from "pdf-parse"; // ✅ direct import works fine in Node

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  let db: Client | null = null;

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    const text = parsed.text?.trim() || "";

    if (!text) {
      return NextResponse.json({ ok: false, error: "PDF has no readable text" }, { status: 400 });
    }

    // ✅ Call OpenAI to extract insurance fields
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are an expert in reading insurance Certificates (COIs). Return valid JSON only, never explanations.",
        },
        {
          role: "user",
          content: `
Extract this information:
{
  "carrier": "",
  "policy_number": "",
  "expiration_date": "",
  "coverage_type": "",
  "named_insured": ""
}

COI TEXT:
${text.slice(0, 8000)}
          `.trim(),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let extracted: any = {};

    try {
      extracted = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      extracted = match ? JSON.parse(match[0]) : { error: "Could not parse response", raw };
    }

    // ✅ Save to Neon DB
    db = new Client({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    });
    await db.connect();
    await db.query(
      `CREATE TABLE IF NOT EXISTS coi_records (
        id SERIAL PRIMARY KEY,
        carrier TEXT,
        policy_number TEXT,
        expiration_date TEXT,
        coverage_type TEXT,
        named_insured TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    );

    await db.query(
      `INSERT INTO coi_records (carrier, policy_number, expiration_date, coverage_type, named_insured)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        extracted.carrier || "",
        extracted.policy_number || "",
        extracted.expiration_date || "",
        extracted.coverage_type || "",
        extracted.named_insured || "",
      ]
    );
    await db.end();

    // ✅ Always return a JSON response
    return NextResponse.json({
      ok: true,
      message: "✅ COI extracted successfully",
      extracted,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ extract-coi error:", err);
    if (db) await db.end().catch(() => {});
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Server crashed unexpectedly",
        time: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi is live. POST a PDF to extract COI details.",
    time: new Date().toISOString(),
  });
}
