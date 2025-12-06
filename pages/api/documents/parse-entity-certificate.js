// pages/api/documents/parse-entity-certificate.js
// ============================================================
// ENTITY CERTIFICATE PARSER V1 — Multi-Doc Engine (Step 1F)
// --------------------------------------------------------
// POST /api/documents/parse-entity-certificate
// Body: { fileUrl: string }
//
// Extracts:
//  - legalName
//  - registrationNumber
//  - state
//  - entityType
//  - formationDate
//  - certificateDate
//  - status: "active" | "inactive" | "revoked" | "dissolved" | "unclear"
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

    const prompt = `
You are an AI that parses business entity certificates such as:
- Certificates of Good Standing
- State registration confirmations
- Entity status letters.

Extract:

{
  "legalName": "...",
  "registrationNumber": "... or null",
  "state": "... or null",
  "entityType": "... or null",
  "formationDate": "YYYY-MM-DD or null",
  "certificateDate": "YYYY-MM-DD or null",
  "status": "active" | "inactive" | "revoked" | "dissolved" | "unclear"
}

Return ONLY valid JSON with exactly these fields.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a JSON-only parser for business entity certificates.",
        },
        {
          role: "user",
          content:
            `Parse the entity certificate PDF at this URL:\n${fileUrl}\n\n` +
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

    const result = {
      legalName: parsed.legalName || null,
      registrationNumber: parsed.registrationNumber || null,
      state: parsed.state || null,
      entityType: parsed.entityType || null,
      formationDate: parsed.formationDate || null,
      certificateDate: parsed.certificateDate || null,
      status: parsed.status || "unclear",
    };

    return res.status(200).json({
      ok: true,
      fileUrl,
      entityCertificate: result,
    });
  } catch (err) {
    console.error("[parse-entity-certificate] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Entity certificate parse failed.",
    });
  }
}
