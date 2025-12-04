// pages/api/coverage/recon.js
// ==========================================================
// PHASE 9 — MULTI-PDF RECON ENGINE
// Upload multiple PDFs → Extract text → AI merges into reconProfile
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
      .json({ ok: false, error: "Only POST supported for recon API." });
  }

  try {
    const form = formidable({ multiples: true });
    const [fields, files] = await form.parse(req);

    const uploadedFiles = files.files || files.file || [];

    const fileArray = Array.isArray(uploadedFiles)
      ? uploadedFiles
      : [uploadedFiles];

    if (!fileArray.length) {
      return res.status(400).json({
        ok: false,
        error: "No PDF files uploaded for recon.",
      });
    }

    // Extract text from each PDF
    const extracted = [];
    for (const f of fileArray) {
      const filepath = f.filepath || f.path;
      const originalName = f.originalFilename || f.newFilename || "Unknown.pdf";

      if (!filepath) continue;

      const buffer = fs.readFileSync(filepath);
      const parsed = await pdfParse(buffer);
      const text = (parsed.text || "").trim();

      if (!text) continue;

      extracted.push({
        filename: originalName,
        text,
      });
    }

    if (!extracted.length) {
      return res.status(400).json({
        ok: false,
        error: "Uploaded PDFs contained no readable text.",
      });
    }

    // Build AI prompt
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an insurance coverage recon engine.

The user has uploaded multiple PDFs which may include:
- General Liability policies
- Auto Liability policies
- Workers Compensation / Employers Liability
- Umbrella / Excess policies
- Endorsements, carrier requirement sheets, etc.

Each PDF is given as { filename, text }.

Your job:
1) Extract the coverage requirements from ALL PDFs.
2) Unify them into a single "reconProfile" of the TOTAL required coverage.
3) Detect contradictions across PDFs (e.g. different limits, endorsements, exclusions).
4) Detect which coverages are present or missing.
5) Summarize any important notes about differences or potential issues.

Return ONLY valid JSON:

{
  "reconProfile": {
    "coverages": [
      {
        "name": "General Liability",
        "limits": "$1,000,000 per occurrence / $2,000,000 aggregate",
        "endorsements": [
          "Additional Insured",
          "Waiver of Subrogation",
          "Primary & Noncontributory"
        ],
        "sources": ["GL.pdf", "UMB.pdf"],
        "conflicts": [
          "Umbrella PDF suggests different GL schedule than GL.pdf"
        ],
        "notes": "Any non-conflict but relevant comments."
      }
    ],
    "globalConflicts": [
      "WC PDF shows Employers Liability 500k, while requirement sheet says 1M."
    ],
    "carrierRequirements": [
      "Carriers rated A- or better by AM Best"
    ],
    "notes": "High level recon notes for the human reviewer."
  }
}

Here is the multi-PDF data:

${JSON.stringify(extracted, null, 2)}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert commercial insurance recon engine. Always return strict JSON.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content;
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("MULTI-PDF RECON JSON PARSE ERROR:", err, raw);
      return res.status(200).json({
        ok: true,
        reconProfile: null,
        warning: "AI returned non-JSON; raw content attached.",
        raw,
      });
    }

    return res.status(200).json({
      ok: true,
      reconProfile: parsed.reconProfile || null,
    });
  } catch (err) {
    console.error("MULTI-PDF RECON API ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Multi-PDF recon failed.",
    });
  }
}
