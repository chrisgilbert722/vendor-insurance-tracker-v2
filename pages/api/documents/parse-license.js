// pages/api/documents/parse-license.js
// ============================================================
// LICENSE PARSER V1 — Multi-Document Intelligence Engine (Step 1B)
// ---------------------------------------------------------------
// POST /api/documents/parse-license
// Body: { fileUrl: string }
//
// Extracts common business license fields:
//  - legalName
//  - licenseNumber
//  - licenseType
//  - state
//  - issueDate
//  - expirationDate
//  - status: "valid" | "expired" | "revoked" | "unclear"
//  - classification (trade / contractor type)
//
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
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { fileUrl } = req.body || {};

    if (!fileUrl || typeof fileUrl !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid fileUrl.",
      });
    }

    // ========================================================
    // 1) Build SYSTEM prompt for OpenAI
    // ========================================================
    const prompt = `
You are an AI that parses U.S. business licenses, contractor licenses,
and state-issued vendor licenses. Extract the following fields:

- legalName: Entity or individual listed on the license
- licenseNumber: Full license number/string
- licenseType: Example: "Contractor", "Business License", "Electrical", etc.
- state: U.S. state or jurisdiction the license applies to
- issueDate: YYYY-MM-DD or null
- expirationDate: YYYY-MM-DD or null
- classification: Contractor classification or trade (if present)
- status:
    "valid" if the license is not expired and appears active
    "expired" if expirationDate is past today
    "revoked" if wording suggests suspension/revocation
    "unclear" if unsure

Return ONLY valid JSON in this shape:

{
  "legalName": "...",
  "licenseNumber": "...",
  "licenseType": "...",
  "state": "...",
  "issueDate": "YYYY-MM-DD or null",
  "expirationDate": "YYYY-MM-DD or null",
  "classification": "... or null",
  "status": "valid | expired | revoked | unclear"
}
`;

    // ========================================================
    // 2) Call OpenAI
    // ========================================================
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You extract structured data from U.S. business and contractor licenses. JSON output only.",
        },
        {
          role: "user",
          content:
            `Parse the license PDF at this URL:\n${fileUrl}\n\n` + prompt,
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

    // Allow code fences
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
        raw: content.slice(0, 300),
      });
    }

    // Normalize defaults
    const result = {
      legalName: parsed.legalName || null,
      licenseNumber: parsed.licenseNumber || null,
      licenseType: parsed.licenseType || null,
      state: parsed.state || null,
      issueDate: parsed.issueDate || null,
      expirationDate: parsed.expirationDate || null,
      classification: parsed.classification || null,
      status: parsed.status || "unclear",
    };

    return res.status(200).json({
      ok: true,
      fileUrl,
      license: result,
    });
  } catch (err) {
    console.error("[parse-license] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "License parse failed.",
    });
  }
}
