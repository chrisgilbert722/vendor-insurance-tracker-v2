// pages/api/documents/parse-contract.js
// ============================================================
// CONTRACT PARSER V1 — Multi-Document Intelligence Engine (Step 1C)
// ---------------------------------------------------------------
// POST /api/documents/parse-contract
// Body: { fileUrl: string }
//
// Extracts:
//  - contractTitle
//  - parties (list)
//  - effectiveDate
//  - expirationDate
//  - renewalTerms (auto-renew? fixed term?)
//  - keyClauses:
//        additionalInsured
//        waiverOfSubrogation
//        indemnification
//        holdHarmless
//        primaryNonContributory
//        cancellationNotice
//        limitsReferenced
//  - missingClauses (AI detection)
//  - riskScore (0–100)
//  - severity ("low", "medium", "high", "critical")
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
    // 1) Contract Parsing Prompt
    // ========================================================
    const prompt = `
You are an AI that parses vendor contracts, service agreements,
and compliance-related agreements.

Extract the following:

{
  "contractTitle": "...",
  "parties": ["Party A", "Party B"],
  "effectiveDate": "YYYY-MM-DD or null",
  "expirationDate": "YYYY-MM-DD or null",
  "renewalTerms": "... or null",

  "keyClauses": {
    "additionalInsured": true/false,
    "waiverOfSubrogation": true/false,
    "indemnification": true/false,
    "holdHarmless": true/false,
    "primaryNonContributory": true/false,
    "cancellationNotice": true/false,
    "limitsReferenced": true/false
  },

  "missingClauses": ["...", "..."],

  "riskScore": number 0-100,
  "severity": "low" | "medium" | "high" | "critical"
}

Rules:
- "missingClauses" must list clauses the contract *should* have for a vendor agreement.
- "riskScore" is lower if more key clauses are missing.
- If expirationDate is in the past → severity = "critical"
- Output ONLY valid JSON. No commentary.
`;

    // ========================================================
    // 2) Call OpenAI with file URL
    // ========================================================
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: "You are a contract parsing AI. JSON only." },
        {
          role: "user",
          content: `Parse the contract PDF at this URL:\n${fileUrl}\n\n` + prompt,
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

    // ========================================================
    // 3) Normalize output
    // ========================================================
    const result = {
      contractTitle: parsed.contractTitle || null,
      parties: Array.isArray(parsed.parties) ? parsed.parties : [],
      effectiveDate: parsed.effectiveDate || null,
      expirationDate: parsed.expirationDate || null,
      renewalTerms: parsed.renewalTerms || null,

      keyClauses: {
        additionalInsured: !!parsed?.keyClauses?.additionalInsured,
        waiverOfSubrogation: !!parsed?.keyClauses?.waiverOfSubrogation,
        indemnification: !!parsed?.keyClauses?.indemnification,
        holdHarmless: !!parsed?.keyClauses?.holdHarmless,
        primaryNonContributory: !!parsed?.keyClauses?.primaryNonContributory,
        cancellationNotice: !!parsed?.keyClauses?.cancellationNotice,
        limitsReferenced: !!parsed?.keyClauses?.limitsReferenced,
      },

      missingClauses: Array.isArray(parsed.missingClauses)
        ? parsed.missingClauses
        : [],

      riskScore:
        typeof parsed.riskScore === "number"
          ? parsed.riskScore
          : 0,

      severity:
        parsed.severity ||
        "unclear",
    };

    return res.status(200).json({
      ok: true,
      fileUrl,
      contract: result,
    });
  } catch (err) {
    console.error("[parse-contract] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Contract parse failed.",
    });
  }
}
