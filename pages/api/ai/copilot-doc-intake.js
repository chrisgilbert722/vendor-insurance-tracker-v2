// pages/api/ai/copilot-doc-intake.js
import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const config = {
  api: {
    bodyParser: false, // must parse manually for PDFs
  },
};

import formidable from "formidable";
import fs from "fs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const buffer = fs.readFileSync(files.file[0].filepath);

    // AI extraction
    const ai = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
You are a document intelligence engine. Extract:
1. Coverage
2. Limits
3. Endorsements
4. Entities
5. Risks
6. Missing items
7. Renewal information
8. Contract obligations (if present)
Output JSON first, then a human explanation.
`,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Extract all key information from this document.",
            },
            {
              type: "input_file",
              file: buffer.toString("base64"),
            },
          ],
        },
      ],
    });

    const result = ai.choices[0].message.content;

    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error("doc-intake error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
