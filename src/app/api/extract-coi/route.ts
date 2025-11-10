import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    // ✅ Dynamically import pdf-parse ONLY on the server
    const pdfParse = await import("pdf-parse").then((mod) => mod.default || mod);
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "No text found in PDF" }, { status: 400 });
    }

    // ✅ Use OpenAI to extract insurance info
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract insurance carrier name, policy number, and expiration date from this COI text.",
        },
        { role: "user", content: text },
      ],
    });

    const aiResult = completion.choices[0]?.message?.content || "No structured data found.";

    return NextResponse.json({ ok: true, message: "Extraction complete", aiResult });
  } catch (err: any) {
    console.error("❌ Extraction error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi is live. POST a FormData with { file: <PDF> }.",
  });
}
