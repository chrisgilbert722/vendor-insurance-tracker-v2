import { NextResponse } from "next/server";
import OpenAI from "openai";
import { parsePdf } from "@/lib/server/pdfParser";

export const runtime = "nodejs"; // 👈 ensures Node environment only

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await parsePdf(buffer);
    const text = pdfData.text || "";
    if (!text.trim())
      return NextResponse.json({ ok: false, error: "Empty or unreadable PDF" }, { status: 400 });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract the insurance company name, policy number, and expiration date from this certificate of insurance text.",
        },
        { role: "user", content: text },
      ],
    });

    const result = completion.choices[0]?.message?.content ?? "No structured data found.";
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error("❌ Server error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Internal server error" });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi active. POST FormData { file: <PDF> }",
  });
}
