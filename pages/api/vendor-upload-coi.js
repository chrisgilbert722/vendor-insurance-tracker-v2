// pages/api/vendor-upload.js

export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { Client } from "pg";
import OpenAI from "openai";

function parseExpiration(dateStr) {
  if (!dateStr) return null;
  // Try MM/DD/YYYY first
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    if (mm && dd && yyyy) {
      return `${mm}/${dd}/${yyyy}`;
    }
  }
  return dateStr;
}

async function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let pgClient = null;

  try {
    const { fields, files } = await parseForm(req);
    const uploaded = files.file?.[0] || files.file;

    const vendorIdParam =
      fields.vendorId?.[0] ||
      fields.vendor_id?.[0] ||
      req.query.vendor ||
      req.query.vendorId;

    const vendorId = parseInt(vendorIdParam, 10);
    if (!uploaded || Number.isNaN(vendorId)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing file or vendor id." });
    }

    // Connect to DB
    pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await pgClient.connect();

    // Get vendor row
    const vendorRes = await pgClient.query(
      `SELECT id, name, org_id FROM public.vendors WHERE id = $1`,
      [vendorId]
    );

    if (vendorRes.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found for this upload link." });
    }

    const vendor = vendorRes.rows[0];

    // Read PDF
    const buffer = fs.readFileSync(uploaded.filepath);
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || !pdfData.text.trim()) {
      throw new Error("Uploaded PDF has no readable text.");
    }

    const text = pdfData.text.slice(0, 20000);

    // AI extraction
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are an insurance COI (Certificate of Insurance) extraction engine.

Given the raw text of a COI, extract the following fields if possible:

{
  "carrier": string | null,
  "policy_number": string | null,
  "coverage_type": string | null,
  "effective_date": string | null,
  "expiration_date": string | null
}

Rules:
- ONLY return valid JSON.
- If you cannot find something, return null for that field.
- "coverage_type" can be a short label e.g. "GL", "General Liability", "Auto", "Umbrella", etc.

COI TEXT:
${text}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a precise JSON-only COI parser. You only respond with JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    let raw = completion.choices[0]?.message?.content || "";
    raw = raw.trim();

    let parsed;
    try {
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      if (first === -1 || last === -1) {
        throw new Error("AI did not return JSON.");
      }
      parsed = JSON.parse(raw.slice(first, last + 1));
    } catch (err) {
      throw new Error("Failed to parse AI JSON: " + err.message);
    }

    const carrier = parsed.carrier ?? null;
    const policyNumber = parsed.policy_number ?? null;
    const coverageType = parsed.coverage_type ?? null;
    const effectiveDate = parsed.effective_date
      ? parseExpiration(parsed.effective_date)
      : null;
    const expirationDate = parsed.expiration_date
      ? parseExpiration(parsed.expiration_date)
      : null;

    // Insert policy
    const insertRes = await pgClient.query(
      `INSERT INTO public.policies
       (vendor_id, vendor_name, org_id, policy_number, carrier, effective_date, expiration_date, coverage_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
       RETURNING id`,
      [
        vendor.id,
        vendor.name,
        vendor.org_id || null,
        policyNumber,
        carrier,
        effectiveDate,
        expirationDate,
        coverageType,
      ]
    );

    const policyId = insertRes.rows[0].id;

    return res.status(200).json({
      ok: true,
      policyId,
      vendor: {
        id: vendor.id,
        name: vendor.name,
      },
      extracted: {
        carrier,
        policy_number: policyNumber,
        coverage_type: coverageType,
        effective_date: effectiveDate,
        expiration_date: expirationDate,
      },
    });
  } catch (err) {
    console.error("vendor-upload error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Upload failed." });
  } finally {
    if (pgClient) {
      try {
        await pgClient.end();
      } catch {
        // ignore
      }
    }
  }
}
