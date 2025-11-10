import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";
import * as pdfParse from "pdf-parse";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Convert uploaded file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    // If the file is PDF → extract text
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const parsed = await (pdfParse as any)(buffer);
      text = parsed.text;
    } else {
      // Otherwise treat as plain text
      text = buffer.toString("utf-8");
    }

    // Ask OpenAI to extract key insurance details
    const prompt = `
      You are an expert insurance document parser.
      Extract key fields from this Certificate of Insurance text.
      Return ONLY valid JSON in this structure:
      {
        "carrier": "",
        "policy_number": "",
        "expiration_date": "",
        "coverage_type": "",
        "named_insured": ""
      }

      Text:
      """${text.slice(0, 8000)}"""
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    const raw = completion.choices[0].message?.content || "{}";
    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch {
      extracted = { error: "Failed to parse AI output", raw };
    }

    // Save extracted data to Neon PostgreSQL
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS certificates (
        id SERIAL PRIMARY KEY,
        carrier TEXT,
        policy_number TEXT,
        expiration_date TEXT,
        coverage_type TEXT,
        named_insured TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(
      `
        INSERT INTO certificates (carrier, policy_number, expiration_date, coverage_type, named_insured)
        VALUES ($1,$2,$3,$4,$5)
      `,
      [
        extracted.carrier || "Unknown",
        extracted.policy_number || "N/A",
        extracted.expiration_date || "N/A",
        extracted.coverage_type || "N/A",
        extracted.named_insured || "N/A",
      ]
    );

    await client.end();

    return NextResponse.json({ ok: true, extracted }, { status: 200 });
    } catch (err: any) {
    console.error("❌ Full server error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown server error", stack: err?.stack },
      { status: 500 }
    );
  }
}
