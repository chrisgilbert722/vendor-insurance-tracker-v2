export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";

// Use pdf-parse and ensure it’s called in Node runtime only
import * as pdfParseModule from "pdf-parse";

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are an expert at reading Certificates of Insurance (COIs). Extract structured insurance data and return valid JSON only.",
        },
        {
          role: "user",
          content: `
Extract the following fields:
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
      extracted = match ? JSON.parse(match[0]) : { error: "Failed to parse model output", raw };
    }

    db = new Client({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    });
    await db.connect();
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

    return NextResponse.json({
      ok: true,
      message: "✅ COI extracted and saved successfully!",
      extracted,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ extract-coi error:", err);
    if (db) await db.end().catch(() => {});
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "✅ /api/extract-coi is live. POST a FormData { file: <PDF> } to extract and save COI details.",
    time: new Date().toISOString(),
  });
}
