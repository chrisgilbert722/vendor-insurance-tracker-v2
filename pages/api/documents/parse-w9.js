// pages/api/documents/parse-w9.js
// ============================================================
// W9 PARSER V1 — Multi-Document Intelligence Engine (Step 1)
// ----------------------------------------------------------
// POST /api/documents/parse-w9
// Body: { fileUrl: string }
//
// The endpoint:
//  - Calls OpenAI on a W-9 PDF (by URL)
//  - Extracts key structured fields:
//      - legalName
//      - businessName
//      - tinType ("EIN" | "SSN" | "Unknown")
//      - ein
//      - ssn
//      - address
//      - status ("valid" | "missing_tin" | "unclear")
//  - Returns JSON payload for use in rules + UI
// ============================================================

import { openai } from "../../../lib/openaiClient";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ ok: false, error: "POST only" });
    }

    const { fileUrl } = req.body || {};

    if (!fileUrl || typeof fileUrl !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid fileUrl.",
      });
    }

    // ========================================================
    // 1) Build prompt for OpenAI — W-9 parsing
    // ========================================================
    const prompt = `
You are a US tax document parsing AI.

You are given a URL to a PDF W-9 form. Extract the following fields as best as possible:

- legalName: The "Name" field from line 1.
- businessName: The "Business name/disregarded entity name" from line 2 (if any).
- tinType: "EIN" if Employer Identification Number is present, "SSN" if Social Security Number is present, or "Unknown" if unclear.
- ein: The EIN value (if present, otherwise null).
- ssn: The SSN value (if present, otherwise null).
- address: Mailing address (street, city, state, ZIP) as a single string.
- status: "valid" if the form looks complete, "missing_tin" if TIN is missing, or "unclear" if you are not sure.

Return ONLY valid JSON in the following shape:

{
  "legalName": "...",
  "businessName": "... or null",
  "tinType": "EIN | SSN | Unknown",
  "ein": "NN-NNNNNNN or null",
  "ssn": "NNN-NN-NNNN or null",
  "address": "... or null",
  "status": "valid | missing_tin | unclear"
}

If something is unknown, use null.
Do not include any fields other than the specified ones.
`;

    // ========================================================
    // 2) Call OpenAI — use the file URL in the system context
    // ========================================================
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a strictly JSON-only parser for US IRS W-9 forms.",
        },
        {
          role: "user",
          content:
            `The W-9 PDF can be downloaded from:\n${fileUrl}\n\n` +
            prompt,
        },
      ],
    });

    let content =
      completion.choices?.[0]?.message?.content?.trim() || "";

    if (!content) {
      return res.status(200).json({
        ok: false,
        error: "AI returned empty response.",
      });
    }

    // Strip code fences if present
    if (content.startsWith("```")) {
      content = content.replace(/```json|```/g, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return res.status(200).json({
        ok: false,
        error: "AI returned invalid JSON.",
        raw: content.slice(0, 500),
      });
    }

    // Basic sane defaults
    const result = {
      legalName: parsed.legalName || null,
      businessName:
        parsed.businessName === "" ? null : parsed.businessName || null,
      tinType: parsed.tinType || "Unknown",
      ein: parsed.ein || null,
      ssn: parsed.ssn || null,
      address:
        parsed.address === "" ? null : parsed.address || null,
      status: parsed.status || "unclear",
    };

    return res.status(200).json({
      ok: true,
      fileUrl,
      w9: result,
    });
  } catch (err) {
    console.error("[parse-w9] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "W9 parse failed.",
    });
  }
}
