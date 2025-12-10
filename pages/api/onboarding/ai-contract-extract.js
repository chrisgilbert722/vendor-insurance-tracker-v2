// pages/api/onboarding/ai-contract-extract.js
// AI Contract Requirement Extraction — Step 5 of Wizard

import { supabase } from "../../../lib/supabaseClient";
import OpenAI from "openai";

export const config = {
  api: {
    bodyParser: true,
  },
};

// Helper: Download PDF bytes from Supabase
async function downloadPdf(bucket, path) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    console.error("[AI Contract Extract] Failed to download PDF", error);
    throw new Error("Could not download PDF from storage.");
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  try {
    const { orgId, documents } = req.body;

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId in request." });
    }
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "No documents provided for extraction.",
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let combinedRequirements = [];
    let contractSummaries = [];

    // Process each contract PDF
    for (const doc of documents) {
      const { bucket, path, name } = doc;

      if (!bucket || !path) {
        console.warn("[AI Contract Extract] Missing bucket/path:", doc);
        continue;
      }

      // 1. Download PDF bytes from Supabase
      const pdfBytes = await downloadPdf(bucket, path);
      const pdfBase64 = Buffer.from(await pdfBytes.arrayBuffer()).toString("base64");

      // 2. Ask OpenAI to extract requirements
      const prompt = `
You are an AI assistant that interprets insurance contract language.
Extract ALL insurance requirements from the attached document.

Return JSON ONLY with this shape:

{
  "summary": "short summary of what's required overall",
  "requirements": [
    {
      "coverage": "General Liability",
      "limit": "$1M",
      "notes": "Any additional context or endorsement requirements"
    }
  ]
}

If no requirements exist, return: { "summary": "", "requirements": [] }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: "You extract insurance requirements from contracts." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "input_file",
                mime_type: "application/pdf",
                data: pdfBase64,
              },
            ],
          },
        ],
        max_tokens: 1500,
      });

      const extracted = safeJson(response.choices?.[0]?.message?.content);

      const summary = extracted.summary || `Extracted requirements from ${name}`;
      const reqs = extracted.requirements || [];

      contractSummaries.push({
        file: name,
        summary,
        requirements: reqs,
      });

      combinedRequirements = [...combinedRequirements, ...reqs];
    }

    return res.status(200).json({
      ok: true,
      summary: "AI extraction complete.",
      documents: contractSummaries,
      requirements: combinedRequirements,
    });
  } catch (err) {
    console.error("[AI Contract Extract] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "AI extraction failed." });
  }
}

/** Safely parse AI JSON output */
function safeJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
