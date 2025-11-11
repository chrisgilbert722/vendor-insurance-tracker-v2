// ✅ Force this API route to use Node.js runtime (fixes DOMMatrix + Buffer issues)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    // 🧾 Get uploaded PDF file
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    // ✅ Dynamically import pdf-parse (works on Node, avoids ESM errors)
    const pdfParseModule = (await import("pdf-parse")) as any;
    const parsePdf = pdfParseModule.default || pdfParseModule;

    // 📄 Convert file into text
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await parsePdf(buffer);
    const text = pdfData.text?.trim();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "No readable text found in PDF." },
        { status: 400 }
      );
    }

    // 🧠 Extract structured data using OpenAI
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `
          Extract and return a JSON object with these fields:
          carrier, policy_number, effective_date, expiration_date, coverage_type.

          If missing data, use "N/A". Here is the text from the COI:
          \n\n${text}
        `,
        },
      ],
    });

    const raw = ai.choices?.[0]?.message?.content || "{}";
    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch {
      extracted = { raw };
    }

    // 🗄️ Save extracted data to Neon (Postgres)
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    await client.query(
      `
      INSERT INTO public.insurance_extracts 
      (file_name, carrier, policy_number, effective_date, expiration_date, coverage_type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
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

    // ✅ Success response
    return NextResponse.json({
      ok: true,
      message: "✅ Extraction completed successfully!",
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
