// pages/api/vendor/ai/parse-coi.js
import OpenAI from "openai";
import { sql } from "../../../../lib/db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { token, fileUrl } = req.body;

    if (!token) return res.status(400).json({ ok: false, error: "Missing token" });
    if (!fileUrl) return res.status(400).json({ ok: false, error: "Missing fileUrl" });

    // Vendor lookup
    const rows = await sql`
      SELECT id, org_id
      FROM vendors
      WHERE magic_link_token = ${token}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Invalid link" });
    }

    const vendor = rows[0];

    // Build prompt
    const prompt = `
Extract COI policy info and return JSON only:
{
  "policies": { "General Liability": {...}, "Auto Liability": {...} },
  "endorsements": ["Additional Insured", "WOS", "PNC", "30-day notice"],
  "compliance": {
    "missingCoverages": [],
    "failedEndorsements": [],
    "expiringSoon": [],
    "overall": "pass|warn|fail"
  }
}
`;

    // Vision call
    const aiRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_file",
              input_file: { url: fileUrl, mime_type: "application/pdf" },
            },
          ],
        },
      ],
    });

    const text = aiRes.choices[0].message.content;
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));

    return res.status(200).json({
      ok: true,
      result: json,
    });
  } catch (err) {
    console.error("[vendor/ai/parse-coi] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
