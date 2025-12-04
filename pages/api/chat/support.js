// pages/api/chat/support.js
// Ultimate Multi-Mode Chat Engine (Vendor Mode, Wizard Mode, Explain Mode, Auto-Fix Mode, Org Brain Mode)

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { messages, orgId, vendorId, path } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ ok: false, error: "Missing messages array." });
    }

    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";

    // ================================================================
    // ⭐ ORG BRAIN MODE DETECTION
    // ================================================================
    const isOrgBrain =
      lastMessage.includes("org brain") ||
      lastMessage.includes("design system") ||
      lastMessage.includes("optimize system") ||
      lastMessage.includes("rebuild system") ||
      lastMessage.includes("industry:") ||
      lastMessage.includes("design compliance") ||
      lastMessage.includes("configure our compliance") ||
      lastMessage.includes("design insurance");

    if (isOrgBrain && orgId) {
      try {
        const brainRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/org/ai-system-designer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId, prompt: lastMessage }),
          }
        );

        const brainJson = await brainRes.json();

        if (!brainJson.ok) {
          return res.status(200).json({
            ok: true,
            reply:
              "⚠️ Org Brain attempted to redesign your system, but encountered an issue:\n\n" +
              (brainJson.error || "Unknown error."),
          });
        }

        // Format Org Brain response nicely
        let reply = `🧠 **ORG BRAIN SYSTEM REBUILD COMPLETE**\n\n`;
        reply += `**Summary:**\n${brainJson.summary}\n\n`;

        reply += `**Rule Groups Created:**\n`;
        brainJson.ruleGroups.forEach((g) => {
          reply += `\n### ${g.label} (${g.severity})\n${g.description}\n`;

          g.rules.forEach((r) => {
            reply += `- **${r.type.toUpperCase()} — ${r.message}**  
Field: *${r.field}*  
Condition: *${r.condition}*  
Value: *${r.value}*  
Severity: *${r.severity}*\n`;
          });
        });

        reply += `\n**Templates Generated:**\n`;
        Object.entries(brainJson.templates || {}).forEach(([k, v]) => {
          reply += `\n---\n**${k.replace(/([A-Z])/g, " $1")}**\n${v}\n`;
        });

        return res.status(200).json({ ok: true, reply });
      } catch (err) {
        console.error("[Org Brain from Chat ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Org Brain encountered an unexpected problem. Try again later.",
        });
      }
    }

    // ================================================================
    // ⭐ AUTO-FIX MODE — Vendor-level automated remediation
    // ================================================================
    const isAutoFix = lastMessage.includes("auto-fix");

    if (isAutoFix && vendorId) {
      try {
        const vendorData = await sql`
          SELECT *
          FROM policies
          WHERE vendor_id = ${vendorId}
        `;

        const rules = await sql`
          SELECT rr.passed, rr.message, rr.severity
          FROM rule_results_v3 rr
          WHERE rr.vendor_id = ${vendorId}
        `;

        const failed = rules.filter((r) => !r.passed);

        const failSummary =
          failed.length === 0
            ? "This vendor currently has no rule failures."
            : failed
                .map((f) => `- **${f.message}** (${f.severity})`)
                .join("\n");

        const fixPrompt = `
The user wants an Auto-Fix Plan for Vendor ID ${vendorId}.
Here is the failing rule summary:

${failSummary}

Create:
1. A short explanation of the vendor's risk condition.
2. A vendor-facing Fix Plan message.
3. A broker-facing request email listing missing or insufficient items.
4. A JSON array of action steps.

Return as plain text, structured with headers.
`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0,
          messages: [
            { role: "system", content: "You are an insurance compliance remediation expert." },
            { role: "user", content: fixPrompt },
          ],
        });

        const text = completion.choices[0].message.content;

        return res.status(200).json({
          ok: true,
          reply: `🚀 **AUTO-FIX PLAN GENERATED**\n\n${text}`,
        });
      } catch (err) {
        console.error("[Auto-Fix Error]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Auto-Fix encountered a problem while generating remediation steps.",
        });
      }
    }

    // ================================================================
    // ⭐ EXPLAIN-THIS-PAGE MODE (❓ button)
    // ================================================================
    const explainMode =
      lastMessage.includes("explain this page") ||
      lastMessage.includes("what is on this page") ||
      lastMessage.includes("explain everything here");

    if (explainMode) {
      const context = `User is on: ${path}\nVendor ID: ${vendorId || "none"}\nOrg ID: ${orgId}`;

      const promptExplain = `
Explain this UI page to the user in simple terms.
Page path: ${path}
Vendor context: ${vendorId ? "Vendor Detail Mode" : "Global Mode"}

Include:
- What the panels mean
- What the KPIs mean
- What actions they should take next
- Any warnings based on common workflows`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are an expert UI explainer and compliance strategist." },
          { role: "user", content: promptExplain },
        ],
      });

      return res.status(200).json({
        ok: true,
        reply: completion.choices[0].message.content,
      });
    }

    // ================================================================
    // ⭐ NORMAL CHAT MODE (fallback for general questions)
    // ================================================================
    const systemPrompt = `
You are an elite insurance compliance AI assistant inside a vendor COI platform.
You respond with:
- Clear reasoning
- Actionable steps
- No hallucinations
- Realistic insurance knowledge
- Short, sharp answers

User context:
- Org ID: ${orgId}
- Vendor ID: ${vendorId || "None"}
- Page: ${path}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    const reply = completion.choices[0].message.content;

    return res.status(200).json({ ok: true, reply });
  } catch (err) {
    console.error("[Support Chat ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Chat engine failed.",
    });
  }
}
