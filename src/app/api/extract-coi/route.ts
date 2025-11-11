import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";
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

    // ✅ Convert PDF → text
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await (pdfParse as any)(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "No text extracted from PDF" }, { status: 400 });
    }

    // ✅ Ask OpenAI for structured JSON output
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an insurance document parser. Return only valid JSON with these fields: carrier, policy_number, effective_date, expiration_date.",
        },
        { role: "user", content: text },
      ],
    });

    const rawResponse = completion.choices[0].message?.content || "{}";

    // ✅ Safely parse JSON from AI
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawResponse);
    } catch {
      // fallback: try regex-based extraction
      parsedData = {
        carrier: rawResponse.match(/carrier[:\s]*([A-Za-z0-9 .-]+)/i)?.[1] || "N/A",
        policy_number: rawResponse.match(/policy[:\s#]*([A-Za-z0-9-]+)/i)?.[1] || "N/A",
        effective_date: rawResponse.match(/effective[:\s]*([A-Za-z0-9/]+)/i)?.[1] || null,
        expiration_date: rawResponse.match(/expire[:\s]*([A-Za-z0-9/]+)/i)?.[1] || null,
      };
    }

    // ✅ Save to Neon DB
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    await client.query(
      "INSERT INTO insurance_extracts (file_name, carrier, policy_number, effective_date, expiration_date) VALUES ($1, $2, $3, $4, $5)",
      [
        file.name,
        parsedData.carrier || "N/A",
        parsedData.policy_number || "N/A",
        parsedData.effective_date || null,
        parsedData.expiration_date || null,
      ]
    );

    await client.end();

    return NextResponse.json({
      ok: true,
      message: "✅ Extraction completed and saved successfully!",
      extracted: parsedData,
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
    message: "✅ /api/extract-coi route is live. POST a FormData { file: <PDF> }",
  });
}
