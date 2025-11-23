// A2.3 — AI Extraction Engine (DB-Compatible Version, Neon Edition)

export const config = {
  api: { bodyParser: false },
};

import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { sql } from "../../lib/db";  // ← Neon client

// Vercel runtime auto-detects Node
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // -------------------------------------------
    // 1) Parse uploaded file
    // -------------------------------------------
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const uploaded =
      files.file?.[0] || files.file;
    if (!uploaded) throw new Error("No PDF uploaded");

    const buffer = fs.readFileSync(uploaded.filepath);
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text) {
      throw new Error("PDF contains no readable text");
    }

    const text = pdfData.text.slice(0, 20000);

    // -------------------------------------------
    // 2) AI extraction (advanced JSON)
    // -------------------------------------------
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `
You are an advanced COI extraction engine.

Extract EVERYTHING into STRICT JSON only:

{
  "vendor_name": string | null,
  "policy_number": string | null,
  "carrier": string | null,
  "coverage_type": string | null,
  "effective_date": string | null,
  "expiration_date": string | null,

  "namedInsured": string | null,
  "additionalInsured": boolean | null,
  "waiverStatus": string | null,

  "limits": string,
  "riskScore": number,
  "flags": string[],
  "missingFields": string[],
  "completenessRating": "High" | "Medium" | "Low"
}

Rules:
- Respond with STRICT VALID JSON ONLY
- Never add explanations
- If unsure, use null
- "limits" should summarize coverage limits in human-readable form
- "riskScore" = 0–100
- "missingFields" lists required fields that appear missing
- "flags" lists any coverage concerns
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
    });

    let raw = completion.choices[0]?.message?.content || "";

    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1) {
      throw new Error("AI returned non-JSON response");
    }

    const parsed = JSON.parse(raw.slice(first, last + 1));

    // -------------------------------------------
    // 3) Normalize for DB insert
    // -------------------------------------------
    const dbRecord = {
      vendor_name:
        parsed.vendor_name ??
        parsed.namedInsured ??
        null,
      policy_number: parsed.policy_number ?? null,
      carrier: parsed.carrier ?? null,
      effective_date: parsed.effective_date ?? null,
      expiration_date: parsed.expiration_date ?? null,
      coverage_type: parsed.coverage_type ?? null,
    };

    // -------------------------------------------
    // 4) Insert into DB using Neon SQL
    // -------------------------------------------
    const rows = await sql`
      INSERT INTO public.policies (
        vendor_name,
        policy_number,
        carrier,
        effective_date,
        expiration_date,
        coverage_type,
        status
      )
      VALUES (
        ${dbRecord.vendor_name},
        ${dbRecord.policy_number},
        ${dbRecord.carrier},
        ${dbRecord.effective_date},
        ${dbRecord.expiration_date},
        ${dbRecord.coverage_type},
        'active'
      )
      RETURNING id;
    `;

    const newId = rows[0]?.id;

    // -------------------------------------------
    // 5) Return all AI fields to frontend
    // -------------------------------------------
    return res.status(200).json({
      id: newId,
      ...parsed,
    });

  } catch (err) {
    console.error("A2.3 ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
