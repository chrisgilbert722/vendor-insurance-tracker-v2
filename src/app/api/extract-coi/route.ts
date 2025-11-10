import { NextResponse } from "next/server";
import OpenAI from "openai";
import { parsePdfOnServer } from "@/lib/server/parsePdf";

export const runtime = "nodejs"; // ✅ never edge

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });

    // ✅ parse only on server
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await parsePdfOnServer(buffer);
    const text = pdfData.text || "";
    if (!text.trim())
      return NextResponse.json({ ok: false, error: "No readable text in PDF" }, { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract the insurance company name, policy number, and expiration date from this COI text.",
        },
        { role: "user", content: text },
      ],
    });

    const result = completion.choices[0]?.message?.content ?? "No structured data found.";
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    console.error("❌ Server error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi ready. POST FormData with { file: <PDF> }.",
  });
}
