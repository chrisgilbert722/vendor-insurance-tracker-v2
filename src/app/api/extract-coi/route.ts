import { NextResponse } from "next/server";
import OpenAI from "openai";
import * as pdfParse from "pdf-parse"; // ✅ Correct import for ESM + Next.js (Vercel compatible)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // ✅ Convert uploaded file (PDF) into text
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "PDF is empty or unreadable" },
        { status: 400 }
      );
    }

    // 🤖 Send PDF text to OpenAI for structured extraction
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI trained to extract structured insurance information from certificates of insurance (COI) documents.",
        },
        {
          role: "user",
          content: `Extract the following fields clearly from this COI PDF text:\n
            - Insured Name
            - Carrier Name
            - Policy Number
            - Expiration Date
            - Type(s) of Coverage
            - Additional Insured if mentioned
            - Any key limits or exclusions\n
            PDF TEXT:\n${text}`,
        },
      ],
      temperature: 0.2,
    });

    const extracted =
      aiResponse.choices[0]?.message?.content?.trim() ||
      "No structured data extracted.";

    // ✅ Return extracted info
    return NextResponse.json({
      ok: true,
      message: "COI extraction complete",
      extracted,
      time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("❌ COI Extraction Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ✅ Optional GET test route (shows it's live)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ Extract-COI route is active and ready",
    time: new Date().toISOString(),
  });
}
