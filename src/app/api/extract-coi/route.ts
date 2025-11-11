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

    // 🧩 Step 1: Extract text from uploaded PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await (pdfParse as any)(buffer);
    const text = pdfData.text || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "No text extracted from PDF" }, { status: 400 });
    }

    // 🧠 Step 2: Use OpenAI to extract structured insurance data
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an insurance document parser. Return only JSON with these fields: carrier, policy_number, effective_date, expiration_date.",
        },
        { role: "user", content: text },
      ],
    });

    const rawResponse = completion.choices[0].message?.content || "{}";

    // 🧩 Step 3: Safely parse JSON or fallback to regex
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawResponse);
    } catch {
      parsedData = {
        carrier: rawResponse.match(/carrier[:\s]*([A-Za-z0-9 .-]+)/i)?.[1] || "N/A",
        policy_number: rawResponse.match(/policy[:\s#]*([A-Za-z0-9-]+)/i)?.[1] || "N/A",
        effective_date: rawResponse.match(/effective[:\s]*([A-Za-z0-9/]+)/i)?.[1] || null,
        expiration_date: rawResponse.match(/expire[:\s]*([A-Za-z0-9/]+)/i)?.[1] || null,
      };
    }

    // 🧠 Step 4: Auto compliance engine
    let complianceStatus = "Pending";
    let complianceScore = 0;

    if (parsedData.expiration_date) {
      const expDate = new Date(parsedData.expiration_date);
      const today = new Date();
      const diffDays = (expDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

      if (diffDays < 0) {
        complianceStatus = "Expired ❌";
        complianceScore = 0;
      } else if (diffDays < 30) {
        complianceStatus = "Expiring Soon ⚠️";
        complianceScore = 50;
      } else {
        complianceStatus = "Compliant ✅";
        complianceScore = 100;
      }
    }

    // 🧾 Step 5: Save to Neon Database
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    await client.query(
      `INSERT INTO insurance_extracts 
      (file_name, carrier, policy_number, effective_date, expiration_date, compliance_status, compliance_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        file.name,
        parsedData.carrier || "N/A",
        parsedData.policy_number || "N/A",
        parsedData.effective_date || null,
        parsedData.expiration_date || null,
        complianceStatus,
        complianceScore,
      ]
    );

    await client.end();

    return NextResponse.json({
      ok: true,
      message: "✅ Extraction and compliance check completed successfully!",
      extracted: parsedData,
      compliance: { complianceStatus, complianceScore },
    });
  } catch (error: any) {
    console.error("❌ Extraction Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error during extraction" },
      { status: 500 }
    );
  }
}

// Simple test route
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "✅ /api/extract-coi route is live and compliance logic is active!",
  });
}

