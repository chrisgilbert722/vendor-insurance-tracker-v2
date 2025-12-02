// pages/api/onboarding/ai/parse-sample-coi.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ ok: false, error: "fileUrl required" });
    }

    const prompt = `
You are an insurance COI expert. Analyze the provided Certificate of Insurance PDF and return:

{
  "brokerStyle": "short text description of formatting style",
  "policyTypes": ["GL","Auto","WC","Umbrella"],
  "limits": {
    "General Liability": {
      "eachOccurrence": 1000000,
      "aggregate": 2000000
    },
    "Auto Liability": {
      "combinedSingleLimit": 1000000
    }
  },
  "endorsements": [
    "Additional Insured",
    "Waiver of Subrogation",
    "Primary & Non-Contributory",
    "30-Day Notice of Cancellation"
  ],
  "recommendedRules": {
    "requireAI": true,
    "requireWOS": true,
    "requirePNC": true,
    "expirationWarningDays": 30
  },
  "observations": "Short human-readable note identifying formatting quirks or carrier behavior"
}

Return ONLY valid JSON.
`;

    // Vision model reading the PDF from URL
    const aiRes = await client.chat.completions.create({
      model: "gpt-4o-mini", // supports PDF Vision
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_file",
              input_file: {
                url: fileUrl,
                mime_type: "application/pdf",
              },
            },
          ],
        },
      ],
    });

    const text = aiRes.choices?.[0]?.message?.content || "{}";

    // Attempt to extract JSON output
    let aiJson;
    try {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}") + 1;
      aiJson = JSON.parse(text.slice(start, end));
    } catch (err) {
      console.error("[parse-sample-coi] JSON parse error:", err, text);
      return res.status(500).json({ ok: false, error: "AI JSON parse error" });
    }

    return res.status(200).json({
      ok: true,
      aiSample: aiJson,
    });
  } catch (err) {
    console.error("[parse-sample-coi] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
