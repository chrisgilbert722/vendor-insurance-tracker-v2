// pages/api/documents/parse-endorsement.js
// ============================================================
// ENDORSEMENT PARSER V1 — Multi-Document Intelligence Engine (Step 1D)
// ---------------------------------------------------------------
// POST /api/documents/parse-endorsement
// Body: { fileUrl: string }
//
// Extracts key endorsement / insurance clause info:
//  - policyNumber
//  - endorsementType (e.g. "Additional Insured", "Waiver of Subrogation", etc.)
//  - references:
//        additionalInsured: true/false
//        waiverOfSubrogation: true/false
//        primaryNonContributory: true/false
//        cancellationNotice: string or null
//  - insuredParties: [ "...", ... ]
//  - namedInsured: "..."
//  - effectiveDate
//  - expirationDate
//  - riskScore: 0–100
//  - severity: "low" | "medium" | "high" | "critical"
//
// This is read-only. No DB writes yet.
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
    // 1) Endorsement Parsing Prompt
    // ========================================================
    const prompt = `
You are an AI that parses insurance endorsements, especially those related to
Additional Insured status, Waiver of Subrogation, Primary & Non-Contributory wording,
and Cancellation notice provisions.

Extract the following object:

{
  "policyNumber": "... or null",
  "endorsementType": "... or null",

  "references": {
    "additionalInsured": true/false,
    "waiverOfSubrogation": true/false,
    "primaryNonContributory": true/false,
    "cancellationNotice": "e.g. '30 days' or null"
  },

  "insuredParties": ["...", "..."],
  "namedInsured": "... or null",

  "effectiveDate": "YYYY-MM-DD or null",
  "expirationDate": "YYYY-MM-DD or null",

  "riskScore": number 0-100,
  "severity": "low" | "medium" | "high" | "critical"
}

Rules for riskScore/severity:
- If additional insured is clearly granted AND waiver of subrogation AND primary/non-contributory all present → riskScore high (80–100), severity "low" or "medium".
- If key clauses are missing or watered down → lower riskScore and higher severity.
- If endorsement is obviously missing key coverage or excludes important parties → severity "high" or "critical".
- If cancellation notice is less than industry standard (e.g. 30 days) → apply small penalty.

Return ONLY valid JSON with exactly the above fields.
`;

    // ========================================================
    // 2) Call OpenAI with file URL
    // ========================================================
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You are a strictly JSON-only parser for insurance endorsements.",
        },
        {
          role: "user",
          content:
            `Parse the endorsement PDF at this URL:\n${fileUrl}\n\n` + prompt,
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

    // Strip code fences if the model wrapped in ```json
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

    // ========================================================
    // 3) Normalize the result
    // ========================================================
    const result = {
      policyNumber: parsed.policyNumber || null,
      endorsementType: parsed.endorsementType || null,

      references: {
        additionalInsured:
          !!parsed?.references?.additionalInsured,
        waiverOfSubrogation:
          !!parsed?.references?.waiverOfSubrogation,
        primaryNonContributory:
          !!parsed?.references?.primaryNonContributory,
        cancellationNotice:
          parsed?.references?.cancellationNotice || null,
      },

      insuredParties: Array.isArray(parsed.insuredParties)
        ? parsed.insuredParties
        : [],
      namedInsured: parsed.namedInsured || null,

      effectiveDate: parsed.effectiveDate || null,
      expirationDate: parsed.expirationDate || null,

      riskScore:
        typeof parsed.riskScore === "number"
          ? parsed.riskScore
          : 0,
      severity:
        parsed.severity ||
        "medium",
    };

    return res.status(200).json({
      ok: true,
      fileUrl,
      endorsement: result,
    });
  } catch (err) {
    console.error("[parse-endorsement] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Endorsement parse failed.",
    });
  }
}
