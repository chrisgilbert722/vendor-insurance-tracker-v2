// pages/api/documents/parse-binder.js
// ============================================================
// BINDER / DEC PAGE PARSER V1 — Multi-Doc Engine (Step 1E)
// --------------------------------------------------------
// POST /api/documents/parse-binder
// Body: { fileUrl: string }
//
// Extracts:
//  - policyNumber
//  - insuredName
//  - insurerName
//  - coverageTypes: ["GL", "Auto", "Umbrella", ...]
//  - limits: { generalLiabilityEachOccurrence, aggregate, autoCSL, umbrellaLimit, ... }
//  - effectiveDate
//  - expirationDate
//  - hasAdditionalInsured
//  - hasWaiverOfSubrogation
//  - status: "bound" | "quote" | "cancelled" | "expired" | "unclear"
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
You are an AI that parses insurance binders and declaration pages.

Extract:

{
  "policyNumber": "... or null",
  "insuredName": "... or null",
  "insurerName": "... or null",

  "coverageTypes": ["GL", "Auto", "Umbrella", "..."],

  "limits": {
    "generalLiabilityEachOccurrence": number or null,
    "generalLiabilityAggregate": number or null,
    "autoCSL": number or null,
    "umbrellaLimit": number or null,
    "workersCompEmployersLiability": number or null
  },

  "effectiveDate": "YYYY-MM-DD or null",
  "expirationDate": "YYYY-MM-DD or null",

  "hasAdditionalInsured": true/false,
  "hasWaiverOfSubrogation": true/false,

  "status": "bound" | "quote" | "cancelled" | "expired" | "unclear"
}

Return ONLY valid JSON, no commentary.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You parse insurance binders and dec pages into JSON only.",
        },
        {
          role: "user",
          content:
            `Parse the binder/dec page PDF at this URL:\n${fileUrl}\n\n` +
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

    const limits = parsed.limits || {};

    const result = {
      policyNumber: parsed.policyNumber || null,
      insuredName: parsed.insuredName || null,
      insurerName: parsed.insurerName || null,
      coverageTypes: Array.isArray(parsed.coverageTypes)
        ? parsed.coverageTypes
        : [],
      limits: {
        generalLiabilityEachOccurrence:
          typeof limits.generalLiabilityEachOccurrence === "number"
            ? limits.generalLiabilityEachOccurrence
            : null,
        generalLiabilityAggregate:
          typeof limits.generalLiabilityAggregate === "number"
            ? limits.generalLiabilityAggregate
            : null,
        autoCSL:
          typeof limits.autoCSL === "number" ? limits.autoCSL : null,
        umbrellaLimit:
          typeof limits.umbrellaLimit === "number"
            ? limits.umbrellaLimit
            : null,
        workersCompEmployersLiability:
          typeof limits.workersCompEmployersLiability === "number"
            ? limits.workersCompEmployersLiability
            : null,
      },
      effectiveDate: parsed.effectiveDate || null,
      expirationDate: parsed.expirationDate || null,
      hasAdditionalInsured: !!parsed.hasAdditionalInsured,
      hasWaiverOfSubrogation: !!parsed.hasWaiverOfSubrogation,
      status: parsed.status || "unclear",
    };

    return res.status(200).json({
      ok: true,
      fileUrl,
      binder: result,
    });
  } catch (err) {
    console.error("[parse-binder] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Binder parse failed.",
    });
  }
}
