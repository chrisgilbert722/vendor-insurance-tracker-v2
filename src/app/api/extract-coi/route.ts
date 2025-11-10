import { NextResponse } from "next/server";
import OpenAI from "openai";
import pdf from "pdf-parse"; // ✅ This is now properly imported for Next.js edge runtime

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

    // ✅ Read PDF buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdf(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "PDF is empty or unreadable" }, { status: 400 });
    }

    // 🧠 Send text to OpenAI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at reading insurance documents and extracting structured fields.",
        },
        {
          role: "user",
          content: `Extract the following from this COI:
          - Insured Name
          - Carrier Name
          - Policy Number
          - Expiration Date
          - Any other relevant fields

          PDF Text:\n${text}`,
        },
      ],
      temperature: 0.2,
    });

    const extracted = aiResponse.choices[0]?.message?.content?.trim() || "No details extracted";

    return NextResponse.json({
      ok: true,
      extracted,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ COI Extraction Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
