export const runtime = "nodejs"; // 👈 Force Node.js runtime (fixes DOMMatrix issue)

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const db = new Client({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamically import pdf-parse (works in Node.js runtime)
    const pdfModule: any = await import("pdf-parse");
    const pdfParse = pdfModule.default || pdfModule;
    const parsed = await pdfParse(buffer);
    const text = parsed?.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "PDF appears empty or unreadable" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You extract structured fields from Certificates of Insurance (COI). Respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: `
Extract the following fields from this COI text. If missing, return an empty string for that field.

Return JSON in exactly this shape (no markdown, no commentary):
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

    // Save to Neon DB
    await db.connect();
    await db.query(
      `
      INSERT INTO coi_records (carrier, policy_number, expiration_date, coverage_type, named_insured)
      VALUES ($1, $2, $3, $4, $5);
      `,
      [
        extracted.carrier || "",
        extracted.policy_number || "",
        extracted.expiration_date || "",
        extracted.coverage_type || "",
        extracted.named_insured || "",
      ]
    );
    await db.end();

    return NextResponse.json(
      { ok: true, extracted, message: "✅ Saved to database", time: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ extract-coi error:", err);
    await db.end().catch(() => {});
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi is live. POST a FormData { file: <PDF> }.",
    time: new Date().toISOString(),
  });
}
