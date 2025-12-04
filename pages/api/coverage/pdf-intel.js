// pages/api/coverage/pdf-intel.js
// ==========================================================
// PHASE 7 — PDF → COVERAGE INTEL
// Upload carrier PDF → Extract text → AI summary
// ==========================================================

import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false, // required for formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Only POST supported for pdf-intel." });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res
        .status(400)
        .json({ ok: false, error: "No PDF file uploaded." });
    }

    // Read PDF and extract text
    const buffer = fs.readFileSync(file.filepath);
    const parsed = await pdfParse(buffer);
    const text = parsed.text || "";

    if (!text.trim()) {
      return res.status(400).json({
        ok: false,
        error: "PDF contains no readable text.",
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an insurance coverage parser.

You will be given PDF-extracted text from carrier requirements or policies.

Extract a structured coverage summary. Return ONLY valid JSON:

{
  "summary": {
    "coverages": [
      {
        "name": "General Liability",
        "limits": "$1,000,000 per occurrence / $2,000,000 aggregate",
        "endorsements": [
          "Additional Insured",
          "Waiver of Subrogation"
        ],
        "notes": "Any GL-related notes here."
      }
    ],
    "exclusions": ["..."],
    "carrierRequirements": ["AM Best A- or better"],
    "notes": "High level notes about the entire requirement set."
  }
}

Now analyze this text:

"""${text}"""
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert commercial insurance coverage parser. Always return valid JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;
    let parsedJson;

    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      console.error("PDF INTEL JSON PARSE ERROR:", err, raw);
      return res.status(200).json({
        ok: true,
        summary: null,
        warning: "AI returned non-JSON; raw content attached.",
        raw,
      });
    }

    return res.status(200).json({
      ok: true,
      summary: parsedJson.summary || null,
    });
  } catch (err) {
    console.error("PDF INTEL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "PDF coverage analysis failed.",
    });
  }
}
