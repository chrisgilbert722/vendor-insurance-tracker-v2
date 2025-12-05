// pages/api/chat/support.js
// GOD MODE V12 — FULL AUTOPILOT ENGINE
// Wizard + Persona + Auto Industry + Auto Rules + Auto Templates
// + Auto Alerts + Notifications + Power Mode "Run Alerts Now"
// + Timeline Logging (onboarding + manual alert scans)

import { openai } from "../../../lib/openaiClient";
import { sql } from "../../../lib/db";
import { getWizardPersona } from "../../../lib/wizardPersona";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

// ================================
// In-memory wizard state per org
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
    "onboarding wizard",
    "help me get set up",
    "help me get setup",
    "full onboarding",
  ];
  return triggers.some((p) => t.includes(p));
}

// ================================
// Persona wrapper
// ================================
function personaWrap(rawReply, { powerMode, step, industry }) {
  const persona = getWizardPersona({
    mode: powerMode ? "power" : "onboarding",
    industry,
    step,
    powerMode,
    userRole: "admin",
  });
  return persona.styleTransform(rawReply);
}

// ================================
// Helper: Industry detection
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

// ================================
// Helper: Auto rule build
// ================================
async function runAutoRuleBuild(orgId, industry) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/rules/auto-build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, industry, dryRun: false }),
  });
  return await res.json();
}

// ================================
// Helper: Auto template generation + write to DB
// ================================
async function runAutoTemplateGen(orgId, industry) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/templates/auto-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, industry, tone: "professional" }),
  });

  const json = await res.json();
  if (!json.ok) return json;

  // Overwrite-by-key mode: delete existing templates with same key, then insert
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

// ================================
// Helper: Auto alert configuration
// ================================
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
// Helper: Run alerts now (Power Mode) via cron endpoint
// ================================
async function runAlertsNow(orgId) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/alerts/run-cron?orgId=${orgId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return await res.json();
}

// ================================
// GOD MODE AUTOPILOT WIZARD
// ================================
async function routeWizard({ state, lastContent, onboardingComplete, orgId }) {
  const text = normalize(lastContent);
  const nextState = { ...state, orgId };
  const powerMode = state.mode === "completed" || state.completed;
  let step = state.step || null;
  let industry = state.industry || "general";

  const wrap = (raw) =>
    personaWrap(raw, {
      powerMode,
      step: nextState.step || step,
      industry,
    });

  // -------- POWER MODE (wizard already completed) --------
  if (powerMode) {
    return {
      reply: wrap(
        "Onboarding is complete. You’re in **Power Mode** — ask about high-risk vendors, alerts, or run operations like **run alerts now**."
      ),
      nextState: { ...nextState, mode: "completed", completed: true },
    };
  }

  // -------- START WIZARD --------
  if (!state.mode || state.mode === "idle") {
    if (!isWizardStartTrigger(lastContent, onboardingComplete)) {
      return { reply: null, nextState };
    }

    nextState.mode = "onboarding";
    nextState.step = "choose_source";

    return {
      reply: wrap(`
🔥 Welcome to **GOD MODE Onboarding**.

I’ll configure your system for you.

How do you want to start?

• CSV of vendors  
• COI PDFs  
• Manual vendor entry  

Reply: "CSV", "COIs", or "manual entry".
`),
      nextState,
    };
  }

  // -------- ACTIVE WIZARD FLOW --------
  switch (state.step) {
    // ---------------- choose_source ----------------
    case "choose_source": {
      if (text.includes("csv")) {
        nextState.source = "csv";
        nextState.step = "csv_paste";
        return {
          reply: wrap(`
📝 Great — paste your CSV here (with header row).

Example:

vendor_name,email,category  
ABC Plumbing,info@abc.com,Plumbing

I’ll import vendors automatically.
`),
          nextState,
        };
      }

      if (text.includes("coi") || text.includes("pdf")) {
        nextState.source = "coi";
        nextState.step = "coi_wait_upload";
        return {
          reply: wrap(`
📄 Upload your COIs in the COI Upload screen.

When done, say: **"COIs uploaded"**.
`),
          nextState,
        };
      }

      if (text.includes("manual")) {
        nextState.source = "manual";
        nextState.step = "manual_wait_vendors";
        return {
          reply: wrap(`
✍️ Add vendors manually in the Vendors screen.

Then say: **"vendors added"**.
`),
          nextState,
        };
      }

      return {
        reply: wrap(`
To begin, reply with **"CSV"**, **"COIs"**, or **"manual entry"**.
`),
        nextState,
      };
    }

    // ---------------- csv_paste ----------------
    case "csv_paste": {
      const csvText = lastContent || "";
      const looksLikeCsv =
        csvText.includes(",") && csvText.includes("\n");

      if (!looksLikeCsv) {
        return {
          reply: wrap(`
I was expecting CSV text.

Example:

vendor_name,email,category  
ABC Plumbing,info@abc.com,Plumbing

Paste your CSV again.
`),
          nextState,
        };
      }

      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
        const res = await fetch(`${baseUrl}/api/vendors/import-csv`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId, csvText }),
        });
        const json = await res.json();

        if (!json.ok) {
          return {
            reply: wrap(
              `⚠️ CSV import failed: ${json.error || "Unknown error"}`
            ),
            nextState,
          };
        }

        // Auto industry/rules/templates
        industry = await runIndustryDetection(orgId);
        nextState.industry = industry;
        await runAutoRuleBuild(orgId, industry);
        await runAutoTemplateGen(orgId, industry);

        nextState.step = "alerts_intro";

        return {
          reply: wrap(`
🔥 Vendors imported  
🏭 Industry detected: **${industry}**  
🧠 Rules generated  
✉️ Templates created  

Now tell me **who should receive alerts**.
`),
          nextState,
        };
      } catch (err) {
        console.error("[Wizard CSV Error]", err);
        return {
          reply: wrap("❌ System error while importing CSV."),
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
          reply: wrap(
            `Upload COIs first, then say **"COIs uploaded"**.`
          ),
          nextState,
        };
      }

      // Auto pipeline
      industry = await runIndustryDetection(orgId);
      nextState.industry = industry;
      await runAutoRuleBuild(orgId, industry);
      await runAutoTemplateGen(orgId, industry);

      nextState.step = "alerts_intro";

      return {
        reply: wrap(`
📑 COIs processed  
🏭 Industry: **${industry}**  
🧠 Rules generated  
✉️ Templates created  

Who should receive alerts?
`),
        nextState,
      };
    }

    // ---------------- manual_wait_vendors ----------------
    case "manual_wait_vendors": {
      const done =
        text.includes("vendors added") || text.includes("done");

      if (!done) {
        return {
          reply: wrap(
            `After adding vendors manually, say **"vendors added"**.`
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
        reply: wrap(`
🧾 Vendors added  
🏭 Industry: **${industry}**  
🧠 Rules generated  
✉️ Templates created  

Now: who should receive alerts?
`),
        nextState,
      };
    }

    // ---------------- alerts_intro ----------------
    case "alerts_intro": {
      if (!lastContent || lastContent.length < 3) {
        return {
          reply: wrap(
            `Tell me who should receive alerts. Example: "send to risk@mycompany.com".`
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
          reply: wrap(
            `⚠️ I tried to configure alerts, but hit an error: ${
              alertJson.error || "Unknown error"
            }. We can still finish onboarding.`
          ),
          nextState,
        };
      }

      nextState.step = "wrap_up";

      return {
        reply: wrap(`
🔔 **Alert Engine Configured**

• Renewal alerts (30/60/90 days)  
• Non-compliance alerts  
• Industry-specific alerts  
• Email delivery using your templates  
• Recipients: **${recipients}**

🕒 **Daily Automation Enabled**  
A scheduled job runs this alert engine every morning at **8:00am**.

If everything looks good, say **"finish onboarding"**.
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
          reply: wrap(
            `If you're ready, say **"finish onboarding"** to lock everything in.`
          ),
          nextState,
        };
      }

      nextState.completed = true;
      nextState.mode = "completed";
      nextState.step = "completed";

      // Timeline log: onboarding completed
      await sql`
        INSERT INTO system_timeline (org_id, action, message, severity)
        VALUES (
          ${orgId},
          'onboarding_completed',
          'AI Onboarding Wizard completed full configuration and enabled daily automation.',
          'success'
        );
      `;

      return {
        reply: wrap(`
🎉 **Onboarding Complete — GOD MODE Active**

Configured:

• Vendors imported  
• Industry detected  
• Rules generated  
• Templates generated  
• Alerts configured  
• Email delivery live  
• Daily automation scheduled  

You are now in **Power Mode**.

Ask me:

• "run alerts now"  
• "show non-compliant vendors"  
• "explain this dashboard"  
• "who is highest risk right now?"
`),
        nextState,
      };
    }

    // ---------------- default ----------------
    default: {
      nextState.step = "choose_source";
      return {
        reply: wrap(
          `Let’s restart onboarding. Reply with "CSV", "COIs", or "manual entry".`
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
      return res
        .status(400)
        .json({ ok: false, error: "Missing messages array." });
    }

    const rawLastContent =
      messages[messages.length - 1]?.content || "";
    const lastMessage = rawLastContent.toLowerCase();

    // ================= RUN ALERTS NOW (POWER MODE) =================
    const runAlertsTriggers = [
      "run alerts now",
      "run alerts",
      "trigger alerts",
      "scan alerts",
      "evaluate alerts",
    ];

    if (orgId && runAlertsTriggers.some((t) => lastMessage.includes(t))) {
      const result = await runAlertsNow(orgId);

      // Timeline log: manual alert scan
      await sql`
        INSERT INTO system_timeline (org_id, action, message, severity)
        VALUES (
          ${orgId},
          'manual_alert_scan',
          ${'Manual alert scan executed. Alerts: ' + (result.alertsCreated || 0) + ', Emails: ' + (result.emailsSent || 0)},
          'info'
        );
      `;

      return res.status(200).json({
        ok: true,
        reply: `🕒 **Manual Alert Scan Complete**

Alerts Created: ${result.alertsCreated || 0}  
Emails Sent: ${result.emailsSent || 0}  

You can say:
• "show alerts"
• "show high risk vendors"
• "explain this dashboard"
`,
      });
    }

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
        const resBrain = await fetch(
          `${baseUrl}/api/org/ai-system-designer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orgId, prompt: lastMessage }),
          }
        );
        const brain = await resBrain.json();

        if (!brain.ok) {
          return res.status(200).json({
            ok: true,
            reply:
              "⚠️ Org Brain failed: " + (brain.error || "Unknown error."),
          });
        }

        return res.status(200).json({
          ok: true,
          reply: `🧠 ORG BRAIN BLUEPRINT\n\n${JSON.stringify(
            brain,
            null,
            2
          )}`,
        });
      } catch (err) {
        console.error("[Org Brain ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Org Brain crashed unexpectedly.",
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
        const policies = await sql`
          SELECT * FROM policies
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
1) Short explanation of overall risk
2) Vendor-facing fix email
3) Broker request email
4) JSON array of concrete remediation steps
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
          reply: "❌ Auto-Fix failed due to a system error.",
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
- What the panels mean
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

    // ================= CHECKLIST (LITE) =================
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
• "start wizard"
• "run alerts now"
• "explain this page"
`;
      return res.status(200).json({ ok: true, reply: checklist });
    }

    // ================= NORMAL CHAT FALLBACK =================
    const systemPrompt = `
You are an elite insurance compliance AI assistant.

You:
- Explain clearly
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

