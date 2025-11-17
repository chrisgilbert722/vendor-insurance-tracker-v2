// pages/api/vendors/upload.js
export const config = {
  api: { bodyParser: false },
};

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { Client } from "pg";

// 🔥 MAIN VENDOR UPLOAD API
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const vendorId = parseInt(req.query.vendorId, 10);
  if (!vendorId || Number.isNaN(vendorId)) {
    return res.status(400).json({
      ok: false,
      error: "Missing or invalid vendorId.",
    });
  }

  let db = null;

  try {
    // -----------------------------
    // 1) Parse vendor's COI upload
    // -----------------------------
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const uploaded = files.file?.[0] || files.file;
    if (!uploaded) throw new Error("No file uploaded");

    const buffer = fs.readFileSync(uploaded.filepath);
    const pdfData = await pdfParse(buffer);
    if (!pdfData.text) throw new Error("Unreadable PDF");

    const text = pdfData.text.slice(0, 20000);

    // -----------------------------
    // 2) AI COI Extraction (v4o-mini)
    // -----------------------------
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
Extract ALL COI fields in STRICT JSON ONLY:

{
  "vendor_name": string | null,
  "policy_number": string | null,
  "carrier": string | null,
  "coverage_type": string | null,
  "effective_date": string | null,
  "expiration_date": string | null,

  "additionalInsured": boolean | null,
  "waiverStatus": string | null,

  "limits": string,
  "riskScore": number,
  "flags": string[],
  "missingFields": string[],
  "completenessRating": "High" | "Medium" | "Low"
}

If unsure, use null. No explanations. JSON ONLY.
`.trim(),
        },
        { role: "user", content: text },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}") + 1;
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd));

    // -------------------------------------------
    // 3) Insert or update POLICY in Neon database
    // -------------------------------------------
    db = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await db.connect();

    const insertPolicy = await db.query(
      `
      INSERT INTO public.policies
      (vendor_id, policy_number, carrier, coverage_type,
       effective_date, expiration_date, status, vendor_name)
      VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
      RETURNING id
    `,
      [
        vendorId,
        parsed.policy_number,
        parsed.carrier,
        parsed.coverage_type,
        parsed.effective_date,
        parsed.expiration_date,
        parsed.vendor_name,
      ]
    );

    const policyId = insertPolicy.rows[0].id;

    // -------------------------------------------
    // 4) Load vendor to get org_id
    // -------------------------------------------
    const vendorRes = await db.query(
      `SELECT org_id FROM public.vendors WHERE id=$1`,
      [vendorId]
    );

    const orgId = vendorRes.rows[0]?.org_id;
    if (!orgId) {
      throw new Error("Vendor is missing org_id.");
    }

    // -------------------------------------------
    // 5) Trigger Auto-Recheck Engine
    // -------------------------------------------
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/recheck/vendor?vendorId=${vendorId}&orgId=${orgId}`
    );

    // -------------------------------------------
    // 6) Return success + AI extraction
    // -------------------------------------------
    return res.status(200).json({
      ok: true,
      policyId,
      extracted: parsed,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed.",
    });
  } finally {
    try {
      await db?.end();
    } catch (_) {}
  }
}
