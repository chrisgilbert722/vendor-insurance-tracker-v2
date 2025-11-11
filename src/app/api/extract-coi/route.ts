import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";

// ✅ Import correctly for pdf-parse (ESM-safe)
import * as pdfParse from "pdf-parse";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // ✅ Convert PDF → text using proper ESM import
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await (pdfParse as any)(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "No text extracted from PDF" }, { status: 400 });
    }

    // 🧠 Send extracted text to OpenAI for structured extraction
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in insurance compliance. Extract carrier, policy number, effective date, and expiration date from the provided document text.",
        },
        { role: "user", content: text },
      ],
    });

    const aiResponse = completion.choices[0].message?.content || "No response";
    const jsonData = { ai_extracted: aiResponse };

    // ✅ Save to Neon
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    await client.query(
      "INSERT INTO insurance_extracts (file_name, carrier, policy_number, effective_date, expiration_date) VALUES ($1, $2, $3, $4, $5)",
      [
        file.name,
        jsonData.ai_extracted.carrier || "N/A",
        jsonData.ai_extracted.policy_number || "N/A",
        jsonData.ai_extracted.effective_date || null,
        jsonData.ai_extracted.expiration_date || null,
      ]
    );

    await client.end();

    return NextResponse.json({
      ok: true,
      message: "✅ Extraction and save successful",
      extracted: jsonData,
    });
  } catch (error: any) {
    console.error("❌ Extraction Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error during extraction" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi route is active. POST a FormData { file: <PDF> }",
  });
}
