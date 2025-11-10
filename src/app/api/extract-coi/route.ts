import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    // 🧾 Get uploaded file
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    // 🧠 Load pdf-parse dynamically (avoids build import issues)
    const { default: pdfParse } = await import("pdf-parse");

    // 📄 Convert PDF to text
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "PDF is empty or unreadable" }, { status: 400 });
    }

    // 🔍 Ask OpenAI to extract structured data
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that extracts structured insurance details from PDF text clearly and accurately.",
        },
        {
          role: "user",
          content: `Extract and summarize key COI fields from this text:\n${text}`,
        },
      ],
      temperature: 0.2,
    });

    const extracted =
      aiResponse.choices[0]?.message?.content?.trim() || "No structured data extracted.";

    return NextResponse.json({
      ok: true,
      message: "COI extraction complete",
      extracted,
    });
  } catch (err: any) {
    console.error("❌ COI Extraction Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ Extract-COI route is active and ready",
  });
}
