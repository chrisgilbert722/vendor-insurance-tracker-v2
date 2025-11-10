import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as pdfParse from "pdf-parse"; // ✅ properly imported as a module

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    // Convert PDF to text
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse.default(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "PDF is empty or unreadable" }, { status: 400 });
    }

    // Ask AI to extract insurance fields
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at reading insurance certificates and extracting structured data clearly.",
        },
        {
          role: "user",
          content: `Extract the following details from this text (if found): 
          - Carrier name
          - Policy number
          - Expiration date
          - Insured name
          \n\nPDF text:\n${text}`,
        },
      ],
      temperature: 0.2,
    });

    const extracted = aiResponse.choices[0]?.message?.content?.trim() || "No data extracted";

    return NextResponse.json({
      ok: true,
      extracted,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ Extraction error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
