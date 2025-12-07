// lib/contracts/parseContractV3.js
// ============================================================
// CONTRACT INTELLIGENCE V3 — AI Parser
// Extracts parties, dates, liability, coverage mins,
// indemnification, additional insured, waiver clauses, etc.
// ============================================================

import { openai } from "../openaiClient";

export async function parseContractV3(contractText) {
  if (!contractText || contractText.length < 40) {
    return { ok: false, error: "Contract text too short." };
  }

  const prompt = `
You are an enterprise contract analyst. Extract ALL insurance-related terms.

Return ONLY valid JSON:

{
  "parties": [],
  "effective_date": "",
  "termination_date": "",
  "jurisdiction": "",
  
  "insurance_requirements": {
    "general_liability": {
      "required": true/false,
      "limit_each_occurrence": number|null,
      "aggregate": number|null
    },
    "auto_liability": {
      "required": true/false,
      "limit": number|null
    },
    "workers_comp": {
      "required": true/false
    },
    "umbrella": {
      "required": true/false,
      "limit": number|null
    }
  },

  "endorsement_clauses": {
    "additional_insured": true/false,
    "primary_non_contributory": true/false,
    "waiver_of_subrogation": true/false
  },

  "indemnification_clause": "",
  "liability_limits": "",
  "notes": ""
}

Contract text:
${contractText}
  `.trim();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: "Return valid JSON only, no explanation." },
        { role: "user", content: prompt }
      ]
    });

    let raw = completion.choices[0].message?.content || "{}";
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    const json = JSON.parse(raw.slice(first, last + 1));

    return { ok: true, data: json };
  } catch (err) {
    console.error("[ContractParserV3 ERROR]", err);
    return { ok: false, error: err.message };
  }
}
