// pages/api/chat/support.js
// Ultimate Multi-Mode Chat Engine v7
// Modes: Checklist, Wizard, Auto-Fix, Vendor, Org Brain, Explain Page, Normal Chat

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
      return res.status(400).json({
        ok: false,
        error: "Missing messages array.",
      });
    }

    const lastMessage =
      messages[messages.length - 1]?.content?.toLowerCase() || "";
    // ================================================================
    // ⭐ ORG BRAIN SUPER MODE — System Designer
    // ================================================================
    const orgBrainTriggers = [
      "org brain",
      "design system",
      "optimize system",
      "insurance requirements",
      "industry:",
      "rebuild system",
      "design compliance",
      "configure insurance",
      "create rule groups",
    ];

    const isOrgBrain = orgBrainTriggers.some((t) =>
      lastMessage.includes(t)
    );

    if (isOrgBrain && orgId) {
      try {
        const brainRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/org/ai-system-designer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId,
              prompt: lastMessage,
            }),
          }
        );

        const brainJson = await brainRes.json();

        if (!brainJson.ok) {
          return res.status(200).json({
            ok: true,
            reply:
              "⚠️ Org Brain tried to rebuild your system but encountered an issue:\n" +
              (brainJson.error || "Unknown error."),
          });
        }

        // Format ORG BRAIN response
        let reply = `🧠 **ORG BRAIN SYSTEM BLUEPRINT GENERATED**\n\n`;
        reply += `### Summary\n${brainJson.summary}\n\n`;
        reply += `### Rule Groups Created\n`;

        brainJson.ruleGroups.forEach((g) => {
          reply += `\n#### ${g.label} (${g.severity})\n${g.description}\n`;
          g.rules.forEach((r) => {
            reply += `- **${r.type.toUpperCase()} — ${r.message}**  
Field: *${r.field}* | Condition: *${r.condition}* | Value: *${r.value}* | Severity: *${r.severity}*\n`;
          });
        });

        reply += `\n### Communication Templates\n`;
        Object.entries(brainJson.templates || {}).forEach(([k, v]) => {
          reply += `\n**${k.replace(/([A-Z])/g, " $1")}**\n${v}\n`;
        });

        return res.status(200).json({ ok: true, reply });
      } catch (err) {
        console.error("[Org Brain Chat ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Org Brain encountered a system error.",
        });
      }
    }
    // ================================================================
    // ⭐ AUTO-FIX MODE — Fully automated remediation
    // ================================================================
    const autopFixTriggers = [
      "auto-fix",
      "autofix",
      "fix vendor",
      "generate fix plan",
    ];

    if (vendorId && autopFixTriggers.some((t) => lastMessage.includes(t))) {
      try {
        const vendorPolicies = await sql`
          SELECT *
          FROM policies
          WHERE vendor_id = ${vendorId}
        `;

        const ruleRows = await sql`
          SELECT passed, message, severity
          FROM rule_results_v3
          WHERE vendor_id = ${vendorId}
        `;

        const failed = ruleRows.filter((r) => !r.passed);

        const failSummary =
          failed.length === 0
            ? "No compliance issues detected."
            : failed
                .map((f) => `- **${f.message}** (${f.severity})`)
                .join("\n");

        const prompt = `
You are an insurance compliance remediation expert.

Vendor ID: ${vendorId}
Failing Rules:
${failSummary}

Create:
1. A short explanation of the vendor’s overall risk.
2. A vendor-facing Fix Plan email.
3. A broker request email listing missing items.
4. JSON array of bullet-point remediation steps.
`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0,
          messages: [
            { role: "system", content: "You fix COI compliance issues." },
            { role: "user", content: prompt },
          ],
        });

        const reply = completion.choices[0].message.content;

        return res.status(200).json({
          ok: true,
          reply: `🚀 **AUTO-FIX PLAN GENERATED**\n\n${reply}`,
        });
      } catch (err) {
        console.error("[AutoFix ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Auto-Fix mode failed.",
        });
      }
    }
    // ================================================================
    // ⭐ EXPLAIN THIS PAGE MODE
    // ================================================================
    const explainTriggers = [
      "explain this page",
      "what is on this page",
      "explain everything here",
      "what am i looking at",
    ];

    if (explainTriggers.some((t) => lastMessage.includes(t))) {
      const promptExplain = `
Explain this UI page to the user in simple terms.
Page: ${path}
Vendor context: ${vendorId ? "Vendor Detail" : "Global Dashboard"}

Explain:
- What each panel means
- How to use the page
- What actions to take next
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You explain UI pages with clarity and precision.",
          },
          { role: "user", content: promptExplain },
        ],
      });

      return res.status(200).json({
        ok: true,
        reply: completion.choices[0].message.content,
      });
    }

    // ================================================================
    // ⭐ ONBOARDING CHECKLIST MODE
    // ================================================================
    const onboardingChecklistTriggers = [
      "start checklist",
      "where do i start",
      "help me get started",
      "how do i onboard",
      "i just signed up",
      "what do i do first",
      "begin onboarding",
    ];

    if (onboardingChecklistTriggers.some((t) => lastMessage.includes(t))) {
      const checklist = `
🧭 **AI Onboarding Checklist**

1️⃣ **Upload Vendors**
• Upload CSV  
• OR drag-and-drop COIs  
• OR manually add vendors  

2️⃣ **AI Detects Your Industry**
Construction, Healthcare, Retail, Property Mgmt, etc.

3️⃣ **AI Builds Rule Groups**
Expiration rules  
Limit rules  
Endorsement checks  
Missing coverage detection  

4️⃣ **AI Generates Templates**
Vendor fix messages  
Broker request emails  
Renewal reminders  

5️⃣ **Activate Your System**
View dashboard  
Resolve alerts  
Invite your team  

Say:
➡️ "Start step 1"  
➡️ "Upload vendors"  
➡️ "Explain rule groups"  
➡️ "Show renewal steps"
`;

      return res.status(200).json({
        ok: true,
        reply: checklist,
      });
    }
    // ================================================================
    // ⭐ NORMAL CHAT MODE (fallback)
    // ================================================================
    const systemPrompt = `
You are an elite insurance compliance AI assistant.
You respond with:
- Accuracy
- Steps the user should take
- Real insurance logic
- No hallucinations

Context:
Org: ${orgId}
Vendor: ${vendorId || "None"}
Page: ${path}
User message: ${lastMessage}
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
