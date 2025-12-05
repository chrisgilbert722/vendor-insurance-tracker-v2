// pages/api/chat/support.js
// Ultimate Multi-Mode Chat Engine v8 — Org Brain, Auto-Fix, Explain Page, GOD MODE Wizard, Checklist, Normal Chat

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

// ================================
// GOD MODE WIZARD STATE (IN-MEMORY)
// ================================
const wizardStateByOrg = {};

function normalize(text) {
  return (text || "").toString().trim().toLowerCase();
}

function isWizardStartTrigger(lastContent, onboardingComplete) {
  const t = normalize(lastContent);

  // If org is not fully onboarded, we are allowed to auto-start wizard
  if (onboardingComplete === false && !t) return true;

  const triggers = [
    "start wizard",
    "start onboarding",
    "run onboarding",
    "configure system",
    "set up system",
    "setup system",
    "help me get set up",
    "help me get setup",
    "onboarding wizard",
    "full onboarding",
  ];

  return triggers.some((phrase) => t.includes(phrase));
}

function routeWizard({ state, lastContent, onboardingComplete }) {
  const text = normalize(lastContent);
  const nextState = { ...state };

  // If wizard is completed, always answer in Power Mode voice
  if (state.mode === "completed" || state.completed) {
    return {
      reply:
        "🎉 Your onboarding is already marked complete. You’re in **Power Mode** now — ask me about vendors, renewals, alerts, or how to improve your rule engine.",
      nextState: { ...state, mode: "completed", completed: true },
    };
  }

  // If wizard has not started yet
  if (!state.mode || state.mode === "idle") {
    if (!isWizardStartTrigger(lastContent, onboardingComplete)) {
      // Caller will fall back to other modes
      return {
        reply: null,
        nextState: state,
      };
    }

    nextState.mode = "onboarding";
    nextState.step = "choose_source";
    nextState.source = null;
    nextState.completed = false;

    return {
      reply: `
🔥 Welcome to **Vendor Insurance Tracker – GOD MODE Onboarding**.

I can configure your entire system for you.

How do you want to start?

1) **CSV** of vendors  
2) **COI PDFs** (certificates)  
3) **Manual vendor entry**

Reply with: **"CSV"**, **"COIs"**, or **"manual entry"**.
      `,
      nextState,
    };
  }

  // Active onboarding session
  if (state.mode === "onboarding") {
    switch (state.step) {
      case "choose_source": {
        const saidCsv =
          text.includes("csv") ||
          text.includes("spreadsheet") ||
          text.includes("excel");
        const saidCoi =
          text.includes("coi") ||
          text.includes("certificate") ||
          text.includes("pdf");
        const saidManual =
          text.includes("manual") ||
          text.includes("type") ||
          text.includes("enter") ||
          text.includes("one by one");

        if (saidCsv) {
          nextState.source = "csv";
          nextState.step = "csv_wait_upload";
          return {
            reply: `
✅ Great — we’ll start with a **CSV of vendors**.

**Step 1 – Prepare CSV**
- One vendor per row  
- Columns: \`vendor_name\`, \`email\`, \`category\` (optional: \`status\`, \`notes\`)

**Step 2 – Upload**
- Use your **Vendor Import / CSV upload** screen
- Drop the CSV there

Once it’s uploaded, say: **"CSV uploaded"** or **"done"**.
            `,
            nextState,
          };
        }

        if (saidCoi) {
          nextState.source = "coi";
          nextState.step = "coi_wait_upload";
          return {
            reply: `
✅ Perfect — we’ll start from **COI PDFs**.

1) Gather your current COI PDFs  
2) Use your **COI upload / drag-and-drop** panel  
3) Drop the PDFs so AI can scan them

Once you’ve uploaded them, say: **"COIs uploaded"** or **"done"**.
            `,
            nextState,
          };
        }

        if (saidManual) {
          nextState.source = "manual";
          nextState.step = "manual_wait_vendors";
          return {
            reply: `
✅ No problem — we’ll do **manual vendor entry**.

Open your **Vendors** screen and add vendors with at least:
- Vendor name  
- Email  
- Category (e.g., HVAC, Plumbing, GC, IT, etc.)

Once you’ve added a first batch, say: **"vendors added"** or **"done"**.
            `,
            nextState,
          };
        }

        return {
          reply: `
To start onboarding, tell me how you want to begin:

1) **CSV** of vendors  
2) **COI PDFs**  
3) **Manual entry**

Reply with: **"CSV"**, **"COIs"**, or **"manual entry"**.
          `,
          nextState,
        };
      }

      case "csv_wait_upload": {
        const saidDone =
          text.includes("csv uploaded") ||
          text.includes("upload complete") ||
          text.includes("done") ||
          text.includes("uploaded");

        if (!saidDone) {
          return {
            reply:
              "I’m waiting on your CSV. Once it’s uploaded, say **\"CSV uploaded\"** or **\"done\"** and I’ll move on.",
            nextState,
          };
        }

        nextState.step = "rules_intro";
        return {
          reply: `
🔥 Awesome — I’ll treat the CSV as your starting vendor list.

Next we’ll handle **rules / requirements** so your system knows how to judge vendors.

Do you want me to:

- **\"auto-build rules\"** (standard industry rules), or  
- **\"use existing rules\"** if you’ve already configured them?`,
          nextState,
        };
      }

      case "coi_wait_upload": {
        const saidDone =
          text.includes("cois uploaded") ||
          text.includes("upload complete") ||
          text.includes("done") ||
          text.includes("uploaded");

        if (!saidDone) {
          return {
            reply:
              "I’m waiting on your COI PDFs. Once they’re uploaded, say **\"COIs uploaded\"** or **\"done\"** and I’ll move on.",
            nextState,
          };
        }

        nextState.step = "rules_intro";
        return {
          reply: `
🔥 COIs received — I’ll treat them as your live certificates.

Next we’ll tune your **rules / requirements** so the system knows how to judge each COI.

Do you want me to:

- **\"auto-build rules\"** from standard COI requirements, or  
- **\"use existing rules\"** if they’re already set up?`,
          nextState,
        };
      }

      case "manual_wait_vendors": {
        const saidDone =
          text.includes("vendors added") ||
          text.includes("added vendors") ||
          text.includes("done");

        if (!saidDone) {
          return {
            reply:
              "Once you’ve added at least a few vendors, say **\"vendors added\"** or **\"done\"** and I’ll move on to rules.",
            nextState,
          };
        }

        nextState.step = "rules_intro";
        return {
          reply: `
✅ Great — you’ve got initial vendors in the system.

Now we’ll handle **rules** so each vendor can be scored automatically.

Say:

- **\"auto-build rules\"** to let me generate standard rules, or  
- **\"use existing rules\"** if you’ve already configured them.`,
          nextState,
        };
      }

      case "rules_intro": {
        const auto =
          text.includes("auto-build") ||
          text.includes("auto build") ||
          text.includes("standard") ||
          text.includes("auto rules");
        const useExisting =
          text.includes("use existing") ||
          text.includes("existing rules") ||
          text.includes("keep rules") ||
          text.includes("use rules");

        if (auto) {
          nextState.rulesMode = "auto";
          nextState.step = "templates_intro";
          return {
            reply: `
✅ I’ll assume a **standard rule set** for common COI requirements (limits, endorsements, additional insured, waivers, etc.).

Next, let’s handle **communication templates**.

Do you want me to:

- **\"use default templates\"** for expiring / non-compliant vendors, or  
- **\"we’ll customize later\"** if your team will rewrite them later?`,
            nextState,
          };
        }

        if (useExisting) {
          nextState.rulesMode = "existing";
          nextState.step = "templates_intro";
          return {
            reply: `
✅ Got it — I’ll rely on your **existing rules** as the source of truth.

Now, templates.

Say:

- **\"use default templates\"** to apply standard messaging, or  
- **\"we’ll customize later\"** if you’ll adjust the wording later.`,
            nextState,
          };
        }

        return {
          reply: `
To move forward, say:

- **\"auto-build rules\"** to let me generate rules, or  
- **\"use existing rules\"** if you want to keep what you have.`,
          nextState,
        };
      }

      case "templates_intro": {
        const useDefault =
          text.includes("use default") ||
          text.includes("default templates") ||
          text.includes("standard templates");
        const customizeLater =
          text.includes("customize later") ||
          text.includes("we'll customize later") ||
          text.includes("we will customize later") ||
          text.includes("our own") ||
          text.includes("rewrite later");

        if (useDefault || customizeLater) {
          nextState.templatesMode = useDefault ? "default" : "custom_later";
          nextState.step = "alerts_intro";
          return {
            reply: `
✅ Templates decision locked in.

Now let’s wire up **alerts & recipients**.

Who should receive **renewal reminders** and **non-compliance alerts**?

Reply with something like:
- "Send to risk@mycompany.com"  
- "Send to me and ap@mycompany.com"  
- Or list specific people / roles.`,
            nextState,
          };
        }

        return {
          reply: `
Tell me:

- **\"use default templates\"** if you want standard messaging, or  
- **\"we’ll customize later\"** if your team will rewrite the emails.`,
          nextState,
        };
      }

      case "alerts_intro": {
        if (!text || text.length < 3) {
          return {
            reply:
              "Tell me who should receive alerts. Example: **\"send to risk@mycompany.com\"** or **\"send to ap@mycompany.com and me\"**.",
            nextState,
          };
        }

        nextState.alertRecipients = lastContent;
        nextState.step = "wrap_up";
        return {
          reply: `
✅ Perfect — I’ll treat these as your **alert recipients**:

> ${lastContent}

Final step: I’ll mark onboarding as **complete** and move you into **Power Mode**.

If everything looks good, say **\"finish onboarding\"** or **\"looks good\"**.`,
          nextState,
        };
      }

      case "wrap_up": {
        const confirm =
          text.includes("finish onboarding") ||
          text.includes("looks good") ||
          text.includes("confirm") ||
          text.includes("yes") ||
          text.includes("ok") ||
          text.includes("sounds good");

        if (!confirm) {
          return {
            reply:
              "If everything looks good, say **\"finish onboarding\"** or **\"looks good\"** and I’ll mark your system as fully configured.",
            nextState,
          };
        }

        nextState.step = "completed";
        nextState.mode = "completed";
        nextState.completed = true;

        return {
          reply: `
🎉 **Onboarding Complete – GOD MODE Activated**

Your org is now treated as **fully configured**.

From here on, I’ll operate in **Power Mode**:
- Analyze vendors and COIs  
- Explain risk scores and alerts  
- Suggest rule tweaks and improvements  
- Help tune renewals and communication flows

Try asking:
- "Which vendors are my highest risk right now?"  
- "Show me who is non-compliant by location."  
- "What should I fix first this week?"`,
          nextState,
        };
      }

      default: {
        nextState.mode = "onboarding";
        nextState.step = "choose_source";
        return {
          reply: `
Let’s restart onboarding cleanly.

How do you want to start?

1) **CSV** of vendors  
2) **COI PDFs**  
3) **Manual entry**

Reply with: **"CSV"**, **"COIs"**, or **"manual entry"**.`,
          nextState,
        };
      }
    }
  }

  // Fallback: no wizard reply — let caller use other modes
  return {
    reply: null,
    nextState: state,
  };
}

// ================================
// MAIN HANDLER
// ================================
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const {
      messages,
      orgId,
      vendorId,
      path,
      onboardingComplete,
    } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        ok: false,
        error: "Missing messages array.",
      });
    }

    const rawLastContent =
      (messages[messages.length - 1] &&
        messages[messages.length - 1].content) ||
      "";
    const lastMessage = rawLastContent.toLowerCase();

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
    // ⭐ GOD MODE WIZARD — Conversational Onboarding Brain
    // (only if orgId present AND either onboarding is incomplete
    //  or user explicitly asks to start the wizard)
    // ================================================================
    if (orgId) {
      const currentState =
        wizardStateByOrg[orgId] || {
          mode: onboardingComplete === false ? "idle" : "completed",
          step: null,
          source: null,
          completed: onboardingComplete !== false,
        };

      const { reply: wizardReply, nextState } = routeWizard({
        state: currentState,
        lastContent: rawLastContent,
        onboardingComplete,
      });

      wizardStateByOrg[orgId] = nextState;

      if (wizardReply) {
        return res.status(200).json({
          ok: true,
          reply: wizardReply,
        });
      }
      // If wizardReply is null, fall through to checklist/normal modes
    }

    // ================================================================
    // ⭐ ONBOARDING CHECKLIST MODE (Lite mode, fallback)
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
User message: ${rawLastContent}
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
