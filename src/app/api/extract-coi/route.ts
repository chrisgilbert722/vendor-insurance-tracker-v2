import { NextResponse } from "next/server";
import OpenAI from "openai";

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

    // Read uploaded file into Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamically import pdf-parse with a safe fallback (ESM/CJS agnostic)
    const pdfModule: any = await import("pdf-parse");
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
      (pdfModule?.default ?? pdfModule) as any;

    // Extract text (assumes PDFs for now; if not a PDF, still try)
    const parsed = await pdfParse(buffer);
    const text = parsed?.text?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "PDF appears empty or could not be read" },
        { status: 400 }
      );
    }

    // Ask OpenAI to extract structured COI fields
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You extract structured fields from Certificates of Insurance (COI). Respond ONLY with valid JSON.",
        },
        {
          role: "user",
          content: `
Extract the following fields from this COI text. If missing, return an empty string for that field.

Return JSON in exactly this shape (no markdown, no commentary):
{
  "carrier": "",
  "policy_number": "",
  "expiration_date": "",
  "coverage_type": "",
  "named_insured": ""
}

COI TEXT:
${text.slice(0, 8000)}
          `.trim(),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let extracted: any = {};
    try {
      extracted = JSON.parse(raw);
    } catch {
      // If model gave extra annotations, try to salvage JSON block
      const match = raw.match(/\{[\s\S]*\}/);
      extracted = match ? JSON.parse(match[0]) : { error: "Failed to parse model output", raw };
    }

    return NextResponse.json(
      { ok: true, extracted, time: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ extract-coi error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi is live. POST a FormData { file: <PDF> }.",
    time: new Date().toISOString(),
  });
}
