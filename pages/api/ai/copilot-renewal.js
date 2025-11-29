// pages/api/ai/copilot-renewal.js
import OpenAI from "openai";
import { sql } from "../../../lib/db";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * AI Copilot Renewal Brain
 * Personas: admin, vendor, broker
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, vendorId, policyId, persona, message } = req.body;

    if (!orgId || !persona || !message) {
      return res.status(400).json({ ok: false, error: "Missing fields." });
    }

    // 1. Build context payload
    const context = await buildRenewalContext({ orgId, vendorId, policyId });

    // 2. Build system prompt
    const systemPrompt = buildSystemPrompt(persona, context);

    // 3. AI Completion
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      ok: true,
      reply,
      context,
    });
  } catch (err) {
    console.error("[copilot-renewal] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
