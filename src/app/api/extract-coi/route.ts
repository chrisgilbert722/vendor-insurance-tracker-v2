export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "pg";

// ✅ import dynamically to stay Node-only
import { extractPdfText } from "@/lib/server/pdfProcessor";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ ok: false, error: "No file uploaded." });

    // Convert to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buffer);
    if (!text) return NextResponse.json({ ok: false, error: "PDF text could not be extracted." });

    // OpenAI extraction
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const prompt = `
      Extract these fields from the COI text as JSON:
      carrier, policy_number, effective_date, expiration_date, coverage_type
      ---
      ${text.slice(0, 4000)}
    `;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a JSON extraction assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
    });

    const raw = completion.choices[0].message?.content || "{}";
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    // Save to database
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(
      `INSERT INTO public.policies (policy_number, carrier, effective_date, expiration_date, coverage_type, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT DO NOTHING`,
      [
        json.policy_number || null,
        json.carrier || null,
        json.effective_date || null,
        json.expiration_date || null,
        json.coverage_type || null,
      ]
    );
    await client.end();

    return NextResponse.json({ ok: true, message: "Extraction completed successfully!", json });
  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
