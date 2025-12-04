// pages/api/chat/support.js
// In-app AI Support Chatbot for admins / users

import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { messages, orgId, vendorId, path } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing messages array" });
    }

    // System prompt: tell the model who it is + what it can talk about
    const systemMessage = {
      role: "system",
      content:
        "You are the in-app AI assistant for a vendor insurance compliance platform. " +
        "Help users understand vendor status, policies, renewals, alerts, and rules in simple, direct language. " +
        "You DO NOT invent actions. You only explain, suggest, and guide. " +
        "If the user asks about things that require live data (like specific vendor details), " +
        "you answer conceptually and remind them that this chat is advisory, not a source of live account data.",
    };

    const userContextMessage = {
      role: "system",
      content:
        `Context:\n` +
        `- orgId: ${orgId || "unknown"}\n` +
        `- vendorId: ${vendorId || "unknown"}\n` +
        `- currentPath: ${path || "unknown"}\n` +
        `Use this context only to adjust your explanation (e.g., if on a vendor page, speak about vendor-level info).`,
    };

    // Last N messages (to keep token usage sane)
    const recentMessages = messages.slice(-8);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [systemMessage, userContextMessage, ...recentMessages],
    });

    const reply = completion.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      ok: true,
      reply,
    });
  } catch (err) {
    console.error("[/api/chat/support] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Chatbot failed" });
  }
}
