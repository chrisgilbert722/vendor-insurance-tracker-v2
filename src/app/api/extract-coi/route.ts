import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // ✅ Force server-only runtime (no Edge/browser)

export async function POST(req: Request) {
  try {
    // ✅ Dynamically import pdf-parse only on the server
    const pdfParseModule = await import("pdf-parse");
    const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

    // ✅ Parse the uploaded file
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    // Convert uploaded file into a buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text from the PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "No readable text found in PDF" }, { status: 400 });
    }

    // ✅ Initialize OpenAI and analyze the PDF text
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that extracts structured insurance data (Company Name, Policy Number, Expiration Date) from Certificates of Insurance (COIs).",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const aiResult = completion.choices[0]?.message?.content || "No structured data found.";

    // ✅ Return parsed results
    return NextResponse.json({
      ok: true,
      message: "Extraction successful",
      result: aiResult,
    });
  } catch (err: any) {
    console.error("❌ PDF Extraction Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi is live. POST FormData with { file: <PDF> }",
  });
}
