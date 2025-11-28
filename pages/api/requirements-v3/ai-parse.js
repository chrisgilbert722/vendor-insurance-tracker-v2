// pages/api/requirements-v3/ai-parse.js
import OpenAI from "openai";

export const config = {
  api: { bodyParser: true },
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { text } = req.body || {};

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: "Return JSON: {\"hello\": \"world\"}",
      response_format: { type: "json_object" },
    });

    // 🔥 TEMP: Return the ENTIRE RAW RESPONSE so we can SEE it
    return res.status(200).json({
      ok: true,
      raw: completion,
    });
  } catch (err) {
    console.error("DEBUG ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
