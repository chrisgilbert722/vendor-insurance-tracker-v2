// pages/api/chat/support.js
// Ultimate Multi-Mode Chat Engine v10 — Full Autopilot
// Org Brain, Auto-Fix, Explain Page, GOD MODE Wizard + Persona Engine,
// CSV Import, COI Flow, Auto-Industry Detection, Auto-Rule Build,
// Auto-Template Generation, Auto-Alert Configuration, Checklist, Normal Chat.

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";
import { getWizardPersona } from "../../../lib/wizardPersona";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

// ================================
// GLOBAL WIZARD STATE (IN-MEMORY)
// ================================
const wizardStateByOrg = {};

function normalize(text) {
  return (text || "").toString().trim().toLowerCase();
}

function isWizardStartTrigger(lastContent, onboardingComplete) {
  const t = normalize(lastContent);
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

  return triggers.some((p) => t.includes(p));
}

// Persona wrapper
function applyPersona(reply, { powerMode, step, industry }) {
  const persona = getWizardPersona({
    mode: powerMode ? "power" : "onboarding",
    industry,
    step,
    powerMode,
    userRole: "admin",
  });
  return persona.styleTransform(reply);
}

// ================================
// HELPER CALLS TO OTHER ENDPOINTS
// ================================
async function runIndustryDetection(orgId) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/intel/industry-auto-detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId }),
  });
  const json = await res.json();
  if (json.ok && json.detected?.industry) return json.detected.industry;
  return "general";
}

async function runAutoRuleBuild(orgId, industry) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/rules/auto-build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, industry, dryRun: false }),
  });
  return await res.json();
}

async function runAutoTemplateGen(orgId, industry) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/templates/auto-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, industry, tone: "professional" }),
  });
  const json = await res.json();
  if (!json.ok) return json;

  // Overwrite-by-key: delete existing templates with same key, insert new
  for (const key of Object.keys(json.templates || {})) {
    const t = json.templates[key];
    await sql`
      DELETE FROM templates
      WHERE org_id = ${orgId} AND key = ${key}
    `;
    await sql`
      INSERT INTO templates (org_id, key, subject, body)
      VALUES (${orgId}, ${key}, ${t.subject}, ${t.body})
    `;
  }

  return json;
}

async function runAutoAlertConfig(orgId, industry, recipients) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/alerts/auto-configure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orgId,
      industry,
      alertRecipients: recipients,
    }),
  });
  return await res.json();
}
// ================================
// GOD MODE WIZARD (FULL AUTOPILOT)
// ================================
async function routeWizard({ state, lastContent, onboardingComplete, orgId }) {
  const text = normalize(lastContent);
  const nextState = { ...state, orgId };
  const powerMode = state.mode === "completed" || state.completed;
  let step = state.step || null;
  let industry = state.industry || "general";

  const personaWrap = (raw) =>
    applyPersona(raw, { powerMode, step: nextState.step || step, industry });

  // Already completed → Power Mode
  if (powerMode) {
    return {
      reply: personaWrap(
        "Your onboarding is complete. I’m now in **Power Mode** — ask me about vendors, risk, alerts, renewals, or what to fix first."
      ),
      nextState: { ...nextState, mode: "completed", completed: true },
    };
  }

  // Not started yet → decide if we should start
  if (!state.mode || state.mode === "idle") {
    if (!isWizardStartTrigger(lastContent, onboardingComplete)) {
      return { reply: null, nextState };
    }
    nextState.mode = "onboarding";
    nextState.step = "choose_source";

    return {
      reply: personaWrap(`
🔥 Welcome to **GOD MODE Onboarding**.

I’ll configure your entire compliance system for you.

How do you want to start?

1) **CSV** of vendors  
2) **COI PDFs**  
3) **Manual vendor entry**

Reply: "CSV", "COIs", or "manual entry".
`),
      nextState,
    };
  }

  // Active wizard
  switch (state.step) {
    // ---------------- choose_source ----------------
    case "choose_source": {
      if (text.includes("csv") || text.includes("excel")) {
        nextState.source = "csv";
        nextState.step = "csv_paste";
        return {
          reply: personaWrap(`
📝 Great — paste your CSV here (with header row).

Example:

\`vendor_name,email,category
ABC Plumbing,info@abc.com,Plumbing\`

I’ll import vendors automatically.
`),
          nextState,
        };
      }

      if (
        text.includes("coi") ||
        text.includes("certificate") ||
        text.includes("pdf")
      ) {
        nextState.source = "coi";
        nextState.step = "coi_wait_upload";
        return {
          reply: personaWrap(`
📄 Upload COIs in your COI Upload screen.

Once uploaded, say: **"COIs uploaded"** or **"done"**.
`),
          nextState,
        };
      }

      if (
        text.includes("manual") ||
        text.includes("type") ||
        text.includes("enter")
      ) {
        nextState.source = "manual";
        nextState.step = "manual_wait_vendors";
        return {
          reply: personaWrap(`
✍️ Add vendors manually in the Vendors screen.

When you’re done, say: **"vendors added"** or **"done"**.
`),
          nextState,
        };
      }

      return {
        reply: personaWrap(`
To start, reply with:

- "CSV"
- "COIs"
- or "manual entry"
`),
        nextState,
      };
    }

    // ---------------- csv_paste ----------------
    case "csv_paste": {
      if (!orgId) {
        return {
          reply: personaWrap(
            "I’m missing your org ID, so I can’t import. Please refresh."
          ),
          nextState,
        };
      }

      const csvText = lastContent || "";
      const looksLikeCsv =
        csvText.includes(",") && csvText.includes("\n");

      if (!looksLikeCsv) {
        return {
          reply: personaWrap(`
I was expecting CSV text.

Example:

\`vendor_name,email,category
ABC Plumbing,info@abc.com,Plumbing\`

Paste your CSV and I’ll import it.
`),
          nextState,
        };
      }

      try {
        // Import CSV
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        const importRes = await fetch(
          `${baseUrl}/api/vendors/import-csv`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId, csvText }),
          }
        );
        const importJson = await importRes.json();
        if (!importJson.ok) {
          return {
            reply: personaWrap(
              `⚠️ CSV import failed: ${importJson.error || "Unknown error"}`
            ),
            nextState,
          };
        }

        // Industry detection
        industry = await runIndustryDetection(orgId);
        nextState.industry = industry;

        // Auto-build rules
        await runAutoRuleBuild(orgId, industry);

        // Auto-generate templates
        await runAutoTemplateGen(orgId, industry);

        nextState.step = "alerts_intro";

        return {
          reply: personaWrap(`
✅ Vendors imported  
🏭 Industry detected: **${industry}**  
🧠 Rules generated  
✉️ Email templates created  

Now: **who should receive alerts?**  
Example: "send to risk@mycompany.com"
`),
          nextState,
        };
      } catch (err) {
        console.error("[Wizard CSV ERROR]", err);
        return {
          reply: personaWrap(
            "❌ CSV import failed due to a system error. Try again."
          ),
          nextState,
        };
      }
    }

    // ---------------- coi_wait_upload ----------------
    case "coi_wait_upload": {
      const saidDone =
        text.includes("cois uploaded") ||
        text.includes("uploaded") ||
        text.includes("done");

      if (!saidDone) {
        return {
          reply: personaWrap(
            `Upload COIs first, then say **"COIs uploaded"**.`
          ),
          nextState,
        };
      }

      // Industry + rules + templates
      industry = await runIndustryDetection(orgId);
      nextState.industry = industry;
      await runAutoRuleBuild(orgId, industry);
      await runAutoTemplateGen(orgId, industry);

      nextState.step = "alerts_intro";

      return {
        reply: personaWrap(`
📄 COIs uploaded  
🏭 Industry detected: **${industry}**  
🧠 Rules generated  
✉️ Templates generated  

Who should receive alerts?
`),
        nextState,
      };
    }

    // ---------------- manual_wait_vendors ----------------
    case "manual_wait_vendors": {
      const saidDone =
        text.includes("vendors added") ||
        text.includes("added vendors") ||
        text.includes("done");

      if (!saidDone) {
        return {
          reply: personaWrap(
            `Add vendors manually, then say **"vendors added"**.`
          ),
          nextState,
        };
      }

      industry = await runIndustryDetection(orgId);
      nextState.industry = industry;
      await runAutoRuleBuild(orgId, industry);
      await runAutoTemplateGen(orgId, industry);

      nextState.step = "alerts_intro";

      return {
        reply: personaWrap(`
🧾 Vendors added  
🏭 Industry: **${industry}**  
🧠 Rules generated  
✉️ Templates generated  

Who should receive alerts?
`),
        nextState,
      };
    }
    // ---------------- alerts_intro ----------------
    case "alerts_intro": {
      if (!lastContent || lastContent.length < 3) {
        return {
          reply: personaWrap(
            `Tell me who should receive alerts. Example: "send to risk@mycompany.com"`
          ),
          nextState,
        };
      }

      const recipients = lastContent;
      nextState.alertRecipients = recipients;

      const alertJson = await runAutoAlertConfig(
        orgId,
        nextState.industry || "general",
        recipients
      );

      if (!alertJson.ok) {
        return {
          reply: personaWrap(
            `⚠️ I tried to configure alerts but hit an error: ${
              alertJson.error || "Unknown"
            }. We can still finish onboarding.`
          ),
          nextState,
        };
      }

      nextState.step = "wrap_up";

      return {
        reply: personaWrap(`
🔔 Alert engine configured:

- Renewal alerts (30/60/90 days)
- Non-compliance alerts
- Industry-specific alerts
- Recipients: **${recipients}**

If this looks good, say **"finish onboarding"**.
`),
        nextState,
      };
    }

    // ---------------- wrap_up ----------------
    case "wrap_up": {
      const confirm =
        text.includes("finish onboarding") ||
        text.includes("looks good") ||
        text.includes("confirm") ||
        text.includes("yes") ||
        text.includes("ok");

      if (!confirm) {
        return {
          reply: personaWrap(
            `If everything is set, say **"finish onboarding"**.`
          ),
          nextState,
        };
      }

      nextState.mode = "completed";
      nextState.completed = true;
      nextState.step = "completed";

      return {
        reply: personaWrap(`
🎉 Onboarding complete.

Configured:

- Vendors imported  
- Industry detected  
- Rules generated  
- Templates generated  
- Alerts configured  

You’re now in **Power Mode**. Ask me about high-risk vendors, non-compliance, or what to fix first.
`),
        nextState,
      };
    }

    // ---------------- default ----------------
    default: {
      nextState.mode = "onboarding";
      nextState.step = "choose_source";
      return {
        reply: personaWrap(
          `Let’s restart. Reply "CSV", "COIs", or "manual entry".`
        ),
        nextState,
      };
    }
  }
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

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Missing messages array.",
      });
    }

    const rawLastContent =
      messages[messages.length - 1]?.content || "";
    const lastMessage = rawLastContent.toLowerCase();

    // ================= ORG BRAIN MODE =================
    const orgBrainTriggers = [
      "org brain",
      "design system",
      "optimize system",
      "industry:",
      "rebuild system",
      "configure insurance",
    ];

    if (orgId && orgBrainTriggers.some((t) => lastMessage.includes(t))) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        const brainRes = await fetch(
          `${baseUrl}/api/org/ai-system-designer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId, prompt: lastMessage }),
          }
        );
        const brain = await brainRes.json();

        if (!brain.ok) {
          return res.status(200).json({
            ok: true,
            reply:
              "⚠️ Org Brain hit an error: " +
              (brain.error || "Unknown."),
          });
        }

        return res.status(200).json({
          ok: true,
          reply: `🧠 ORG BRAIN RESULT\n\n${JSON.stringify(brain, null, 2)}`,
        });
      } catch (err) {
        console.error("[Org Brain ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Org Brain failed.",
        });
      }
    }

    // ================= AUTO-FIX MODE =================
    const autoFixTriggers = [
      "auto-fix",
      "autofix",
      "fix vendor",
      "generate fix plan",
    ];

    if (vendorId && autoFixTriggers.some((t) => lastMessage.includes(t))) {
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
                .map((f) => `- ${f.message} (${f.severity})`)
                .join("\n");

        const prompt = `
Vendor ID: ${vendorId}

Failing Rules:
${failSummary}

Create:
1) Short explanation of risk
2) Vendor-facing fix email
3) Broker request email
4) JSON array of steps
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
          reply: `🚀 AUTO-FIX PLAN\n\n${reply}`,
        });
      } catch (err) {
        console.error("[AutoFix ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Auto-Fix failed.",
        });
      }
    }

    // ================= EXPLAIN PAGE MODE =================
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
- What panels mean
- How to use the page
- What actions to take next
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You explain UI pages clearly and concisely.",
          },
          { role: "user", content: promptExplain },
        ],
      });

      return res.status(200).json({
        ok: true,
        reply: completion.choices[0].message.content,
      });
    }
    // ================= WIZARD (GOD MODE) =================
    if (orgId) {
      const currentState =
        wizardStateByOrg[orgId] || {
          mode: onboardingComplete === false ? "idle" : "completed",
          step: null,
          source: null,
          completed: onboardingComplete !== false,
          industry: "general",
        };

      const { reply: wizardReply, nextState } = await routeWizard({
        state: currentState,
        lastContent: rawLastContent,
        onboardingComplete,
        orgId,
      });

      wizardStateByOrg[orgId] = nextState;

      if (wizardReply) {
        return res.status(200).json({
          ok: true,
          reply: wizardReply,
        });
      }
    }

    // ================= CHECKLIST MODE (LITE) =================
    const checklistTriggers = [
      "start checklist",
      "where do i start",
      "help me get started",
      "how do i onboard",
      "i just signed up",
      "what do i do first",
      "begin onboarding",
    ];

    if (checklistTriggers.some((t) => lastMessage.includes(t))) {
      const checklist = `
🧭 AI Onboarding Checklist

1) Upload or paste vendors (CSV, COIs, or manual)
2) Let AI detect your industry
3) Let AI auto-build rules
4) Let AI generate templates
5) Let AI configure alerts
6) Use Power Mode to manage risk

You can say:
- "start wizard"
- "upload vendors"
- "explain rules"
- "show my alerts"
`;
      return res.status(200).json({ ok: true, reply: checklist });
    }

    // ================= NORMAL CHAT (FALLBACK) =================
    const systemPrompt = `
You are an elite insurance compliance AI assistant.

You:
- Explain things clearly
- Suggest exact next steps
- Use real insurance logic
- Do not hallucinate details

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
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
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
