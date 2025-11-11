import { NextResponse } from "next/server";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
import { Client } from "pg";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded." }, { status: 400 });
    }

    // Read PDF as buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text?.trim();

    if (!text) {
      return NextResponse.json({ ok: false, error: "PDF has no readable text." }, { status: 400 });
    }

    // Extract key data via OpenAI
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Extract the following fields from this insurance document:\n\n${text}\n\nReturn JSON with carrier, policy_number, effective_date, expiration_date, and coverage_type.`,
        },
      ],
    });

    const json = ai.choices?.[0]?.message?.content || "{}";
    let extracted;
    try {
      extracted = JSON.parse(json);
    } catch {
      extracted = { raw: json };
    }

    // Save to DB
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(
      `INSERT INTO public.insurance_extracts (file_name, carrier, policy_number, effective_date, expiration_date, coverage_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        file.name,
        extracted.carrier || "Unknown",
        extracted.policy_number || "N/A",
        extracted.effective_date || null,
        extracted.expiration_date || null,
        extracted.coverage_type || "N/A",
      ]
    );
    await client.end();

    // ✅ Always return JSON
    return NextResponse.json({
      ok: true,
      message: "Extraction completed successfully!",
      extracted,
    });
  } catch (error: any) {
    console.error("❌ Error in /api/extract-coi:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
