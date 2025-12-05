// pages/api/chat/support.js
// GOD MODE V14 — FULL AUTOPILOT ENGINE
// Wizard + Persona + Auto Industry + Auto Rules + Auto Templates
// + Auto Alerts + Notifications + Power Mode Commands
// + Vendor Email Ops + Vendor Risk Explainer + Timeline Logging

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
  const res = await fetch("/api/intel/industry-auto-detect", {
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
  const res = await fetch("/api/rules/auto-build", {
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
  const res = await fetch("/api/templates/auto-generate", {
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
  const res = await fetch("/api/alerts/auto-configure", {
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
  const res = await fetch(`/api/alerts/run-cron?orgId=${orgId}`, {
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
        const res = await fetch("/api/vendors/import-csv", {
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

    // =====================================================
    // POWER MODE — RUN ALERTS NOW
    // =====================================================
    const runAlertsTriggers = [
      "run alerts now",
      "run alerts",
      "trigger alerts",
      "scan alerts",
      "evaluate alerts",
    ];

    if (orgId && runAlertsTriggers.some((t) => lastMessage.includes(t))) {
      const result = await runAlertsNow(orgId);

      // Timeline log entry
      await sql`
        INSERT INTO system_timeline (org_id, action, message, severity)
        VALUES (
          ${orgId},
          'manual_alert_scan',
          ${'Manual alert scan executed. Alerts: ' +
          (result.alertsCreated || 0) +
          ', Emails: ' +
          (result.emailsSent || 0)},
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
• "explain this vendor"
• "email vendor 12 a renewal reminder"
• "who is highest risk?"
`,
      });
    }

    // =====================================================
    // POWER MODE — VENDOR EMAIL COMMAND ENGINE
    // =====================================================
    const vendorEmailTriggers = [
      "email vendor",
      "send vendor",
      "message vendor",
    ];

    if (orgId && vendorEmailTriggers.some((t) => lastMessage.includes(t))) {
      // 1) Parse vendor ID
      let targetVendorId = vendorId || null;
      const idMatch = lastMessage.match(/vendor\s+(\d+)/);
      if (!targetVendorId && idMatch) {
        const parsed = parseInt(idMatch[1], 10);
        if (!Number.isNaN(parsed)) targetVendorId = parsed;
      }

      if (!targetVendorId) {
        return res.status(200).json({
          ok: true,
          reply:
            "I heard you want to email a vendor, but no vendor ID was provided. Try: **email vendor 23 a renewal reminder**.",
        });
      }

      // 2) Determine template type from human language
      let templateKey = "renewal_reminder";
      if (lastMessage.includes("non-compliance")) templateKey = "non_compliance_notice";
      else if (lastMessage.includes("broker")) templateKey = "broker_request";
      else if (lastMessage.includes("fix")) templateKey = "vendor_fix";
      else if (lastMessage.includes("welcome")) templateKey = "welcome_onboarding";

      // 3) Load vendor
      const vendorRows = await sql`
        SELECT id, vendor_name, email
        FROM vendors
        WHERE id = ${targetVendorId} AND org_id = ${orgId}
        LIMIT 1
      `;

      if (!vendorRows.length) {
        return res.status(200).json({
          ok: true,
          reply: `I couldn’t find vendor ID **${targetVendorId}** for this org.`,
        });
      }

      const vendor = vendorRows[0];
      if (!vendor.email) {
        return res.status(200).json({
          ok: true,
          reply: `Vendor **${
            vendor.vendor_name || vendor.id
          }** does not have an email address on file.`,
        });
      }

      // 4) Send notification email
      try {
        const payload = {
          orgId,
          to: vendor.email,
          templateKey,
          bodyParams: {
            VENDOR_NAME: vendor.vendor_name || `Vendor ${vendor.id}`,
            OUR_ORG_NAME: "Your Organization",
            ALERT_MESSAGE: "Compliance update",
          },
        };

        const sendRes = await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const sendJson = await sendRes.json();

        if (!sendJson.ok) {
          return res.status(200).json({
            ok: true,
            reply:
              "I tried to send the email, but the notification service reported an error: " +
              (sendJson.error || "Unknown error."),
          });
        }

        // Log timeline
        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (
            ${orgId},
            ${vendor.id},
            'vendor_email_command',
            ${'Sent ' + templateKey + ' email to ' + (vendor.vendor_name || 'Vendor ' + vendor.id)},
            'info'
          );
        `;

        return res.status(200).json({
          ok: true,
          reply: `✅ Email sent to **${vendor.vendor_name || vendor.id}** at **${
            vendor.email
          }** using template **${templateKey}**.`,
        });
      } catch (err) {
        console.error("[Vendor Email Command ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ I tried to send the vendor email, but a system error occurred.",
        });
      }
    }

    // =====================================================
    // POWER MODE — VENDOR RISK EXPLAINER ENGINE
    // =====================================================
    const vendorRiskTriggers = [
      "explain this vendor",
      "explain vendor",
      "vendor risk",
      "why is vendor",
      "why is this vendor",
      "what is this vendor's risk",
      "what is this vendors risk",
      "why are they failing",
      "why is this vendor failing",
    ];

    if (orgId && vendorRiskTriggers.some((t) => lastMessage.includes(t))) {
      // 1) Determine vendor ID
      let targetVendorId = vendorId || null;
      const idMatch = lastMessage.match(/vendor\s+(\d+)/);
      if (!targetVendorId && idMatch) {
        const parsed = parseInt(idMatch[1], 10);
        if (!Number.isNaN(parsed)) targetVendorId = parsed;
      }

      if (!targetVendorId) {
        return res.status(200).json({
          ok: true,
          reply: `I can explain a vendor’s risk, but I need a vendor ID. Try **explain vendor 23**.`,
        });
      }

      // 2) Load vendor
      const vendorRows = await sql`
        SELECT id, vendor_name, email
        FROM vendors
        WHERE id = ${targetVendorId} AND org_id = ${orgId}
        LIMIT 1
      `;

      if (!vendorRows.length) {
        return res.status(200).json({
          ok: true,
          reply: `I couldn’t find vendor ID **${targetVendorId}** for this org.`,
        });
      }

      const vendor = vendorRows[0];

      // 3) Load policies
      const policyRows = await sql`
        SELECT *
        FROM policies
        WHERE vendor_id = ${vendor.id}
      `;

      // 4) Load rule engine results
      const ruleRows = await sql`
        SELECT passed, message, severity
        FROM rule_results_v3
        WHERE vendor_id = ${vendor.id}
      `;

      // 5) Load alerts
      const alertRows = await sql`
        SELECT code, message, severity, created_at
        FROM vendor_alerts
        WHERE vendor_id = ${vendor.id}
        ORDER BY created_at DESC
        LIMIT 20
      `;

      // 6) Build AI prompt
      const riskPrompt = `
You are an expert insurance compliance analyst.

Analyze this vendor's risk profile and explain it clearly, with action steps.

Vendor:
${JSON.stringify(vendor, null, 2)}

Policies:
${JSON.stringify(policyRows, null, 2)}

Rule Engine Results (rule_results_v3):
${JSON.stringify(ruleRows, null, 2)}

Alerts (vendor_alerts):
${JSON.stringify(alertRows, null, 2)}

Please respond with:

1) A short high-level summary of the vendor's overall risk (1–2 sentences)
2) Key issues / reasons they are failing or at risk
3) What this means in practical terms for the organization
4) Concrete remediation steps to request from the vendor (bullet points)
5) Which email template to send first (renewal_reminder, non_compliance_notice, broker_request, vendor_fix, welcome_onboarding) and why
`;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are an elite insurance compliance risk analyst. You explain vendor risk and remediation clearly and practically.",
            },
            { role: "user", content: riskPrompt },
          ],
        });

        const aiReply = completion.choices[0].message.content;

        // Log timeline entry
        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (
            ${orgId},
            ${vendor.id},
            'vendor_risk_explained',
            ${'AI generated risk explanation for vendor ' + (vendor.vendor_name || vendor.id)},
            'info'
          );
        `;

        return res.status(200).json({
          ok: true,
          reply: aiReply,
        });
      } catch (err) {
        console.error("[Vendor Risk Explainer ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply:
            "❌ I tried to analyze this vendor's risk, but a system error occurred.",
        });
      }
    }
    // =====================================================
    // ORG BRAIN MODE — System Designer
    // =====================================================
    const orgBrainTriggers = [
      "org brain",
      "design system",
      "optimize system",
      "industry:",
      "rebuild system",
      "configure insurance",
      "create rule groups",
      "rebuild rules",
      "insurance requirements",
    ];

    if (orgId && orgBrainTriggers.some((t) => lastMessage.includes(t))) {
      try {
        const resBrain = await fetch("/api/org/ai-system-designer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            prompt: lastMessage,
          }),
        });

        const brain = await resBrain.json();

        if (!brain.ok) {
          return res.status(200).json({
            ok: true,
            reply:
              "⚠️ Org Brain encountered an issue: " +
              (brain.error || "Unknown error."),
          });
        }

        return res.status(200).json({
          ok: true,
          reply:
            `🧠 **ORG BRAIN SYSTEM BLUEPRINT**\n\n` +
            JSON.stringify(brain.summary, null, 2) +
            `\n\n**Rule Groups:**\n` +
            JSON.stringify(brain.ruleGroups, null, 2) +
            `\n\n**Templates:**\n` +
            JSON.stringify(brain.templates, null, 2),
        });
      } catch (err) {
        console.error("[Org Brain Chat ERROR]", err);
        return res.status(200).json({
          ok: true,
          reply: "❌ Org Brain crashed unexpectedly.",
        });
      }
    }

    // =====================================================
    // AUTO-FIX MODE — Fully automated remediation engine
    // =====================================================
    const autoFixTriggers = [
      "auto-fix",
      "autofix",
      "fix vendor",
      "generate fix plan",
      "create fix plan",
      "remediation plan",
    ];

    if (vendorId && autoFixTriggers.some((t) => lastMessage.includes(t))) {
      try {
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
                .map((f) => `• ${f.message} (${f.severity})`)
                .join("\n");

        const autoFixPrompt = `
You are an insurance compliance remediation expert.

Vendor ID: ${vendorId}
Failing Rules:
${failSummary}

Create:
1. A short explanation of the vendor’s overall risk.
2. A vendor-facing Fix Plan email.
3. A broker request email listing missing or incorrect items.
4. JSON array of actionable remediation steps.
`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0.1,
          messages: [
            { role: "system", content: "You fix COI compliance issues precisely." },
            { role: "user", content: autoFixPrompt },
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
          reply: "❌ Auto-Fix mode failed due to a system error.",
        });
      }
    }

    // =====================================================
    // EXPLAIN THIS PAGE MODE — UI interpreter
    // =====================================================
    const explainTriggers = [
      "explain this page",
      "what is on this page",
      "explain everything here",
      "what am i looking at",
      "explain this screen",
      "what does this page mean",
    ];

    if (explainTriggers.some((t) => lastMessage.includes(t))) {
      const explainPrompt = `
Explain this UI page to the user in simple terms.

Page: ${path}
Vendor context: ${vendorId ? "Vendor Detail Page" : "Global Dashboard"}

Explain:
- What each panel represents
- What the metrics mean
- What actions the user should take next
- Any risk signals the user should pay attention to
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an expert UI guide that explains application screens clearly.",
          },
          { role: "user", content: explainPrompt },
        ],
      });

      return res.status(200).json({
        ok: true,
        reply: completion.choices[0].message.content,
      });
    }
    // =====================================================
    // GOD MODE WIZARD — EXECUTION HOOK
    // =====================================================
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

      // If wizard handled message — we stop here
      if (wizardReply) {
        return res.status(200).json({
          ok: true,
          reply: wizardReply,
        });
      }
    }

    // =====================================================
    // CHECKLIST MODE (Lite fallback)
    // =====================================================
    const checklistTriggers = [
      "start checklist",
      "where do i start",
      "help me get started",
      "how do i onboard",
      "i just signed up",
      "what do i do first",
      "begin onboarding",
      "start onboarding checklist",
    ];

    if (checklistTriggers.some((t) => lastMessage.includes(t))) {
      const checklist = `
🧭 **AI Onboarding Checklist**

1) Upload or paste vendors  
   • CSV  
   • COIs  
   • Manual entry  

2) AI detects your industry  
3) AI auto-builds rules  
4) AI generates templates  
5) AI configures alert engine  
6) Use Power Mode to operate the system  

You can say:
• "start wizard"  
• "run alerts now"  
• "explain this page"  
• "explain vendor 12"  
`;
      return res.status(200).json({
        ok: true,
        reply: checklist,
      });
    }

    // =====================================================
    // NORMAL CHAT — FALLBACK MODE
    // =====================================================
    const systemPrompt = `
You are an elite insurance compliance AI assistant.

You:
- Explain clearly
- Suggest exact next steps
- Use real insurance logic
- Provide practical actions
- Never hallucinate details

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

    return res.status(200).json({
      ok: true,
      reply,
    });
  } catch (err) {
    console.error("[Support Chat ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Chat engine failed.",
    });
  }
}
// =====================================================
// END OF GOD MODE V14 — support.js
// =====================================================

// Nothing else needed here — the main handler above
// completes the full routing flow for:
//
// ✔ GOD MODE Autopilot Wizard
// ✔ Vendor Email Engine
// ✔ Vendor Risk Explainer
// ✔ Run Alerts Now (Power Mode)
// ✔ Org Brain System Designer
// ✔ Auto-Fix Mode
// ✔ Explain Page Mode
// ✔ Checklist Fallback
// ✔ Normal Chat with Insurance-Aware Context
//
// File exported cleanly above.
