// lib/wizardPersona.js
// GOD MODE V3 — Wizard Personality Engine
// Shapes tone, language, energy, and emoji usage depending on wizard mode + industry + user context.

export function getWizardPersona({ 
  mode = "onboarding", 
  industry = "general", 
  step = null, 
  powerMode = false,
  userRole = "admin",
}) {
  // Base persona object
  const persona = {
    label: "Default",
    tone: "professional, clear",
    energy: "medium",
    emoji: true,
    signature: null,
    styleTransform: (text) => text // replaced dynamically
  };

  // ===============================
  // POWER MODE (system fully configured)
  // ===============================
  if (powerMode) {
    persona.label = "Power Mode Analyst";
    persona.tone = "direct, analytical, confidence";
    persona.energy = "low-medium";
    persona.emoji = false;
    persona.signature = null;
    persona.styleTransform = (text) =>
      `🧠 **Power Mode** → ${text}`;
    return persona;
  }

  // ===============================
  // ONBOARDING MODE
  // ===============================
  if (mode === "onboarding") {
    persona.label = "Friendly Onboarding Coach";
    persona.tone = "friendly, encouraging, simple";
    persona.energy = "high";
    persona.emoji = true;
    persona.signature = "🙂";

    persona.styleTransform = (text) =>
      `😊 ${text}\n\nLet’s keep going — you’re doing great!`;

    // Step-specific adjustments
    if (step === "choose_source") {
      persona.styleTransform = (text) =>
        `🎉 ${text}\n\nJust tell me how you'd like to start — CSV, COIs, or manual entry.`;
    }
    if (step === "csv_paste") {
      persona.styleTransform = (text) =>
        `📝 ${text}\n\nPaste your CSV whenever you're ready!`;
    }
    if (step === "rules_intro") {
      persona.styleTransform = (text) =>
        `🧠 ${text}\n\nI’ll help you build a solid rule foundation.`;
    }
    if (step === "templates_intro") {
      persona.styleTransform = (text) =>
        `✉️ ${text}\n\nTemplates save tons of time — let me handle them!`;
    }
    if (step === "alerts_intro") {
      persona.styleTransform = (text) =>
        `🔔 ${text}\n\nAlerts keep your system safe automatically.`;
    }

    return persona;
  }

  // ===============================
  // INDUSTRY-SPECIFIC MODES
  // ===============================
  const ind = industry.toLowerCase();

  if (ind.includes("construction")) {
    persona.label = "Construction Compliance Advisor";
    persona.tone = "firm, clear, safety-focused";
    persona.energy = "medium-high";
    persona.emoji = false;
    persona.styleTransform = (text) =>
      `🏗️ **Construction Compliance** → ${text}`;
    return persona;
  }

  if (ind.includes("healthcare")) {
    persona.label = "Healthcare Compliance Guide";
    persona.tone = "calm, empathetic, precise";
    persona.energy = "medium";
    persona.emoji = false;
    persona.styleTransform = (text) =>
      `🏥 **Healthcare Compliance** → ${text}`;
    return persona;
  }

  if (ind.includes("property")) {
    persona.label = "Property Management Advisor";
    persona.styleTransform = (text) =>
      `🏢 **Property Mgmt** → ${text}`;
    return persona;
  }

  if (ind.includes("retail")) {
    persona.label = "Retail Compliance Assistant";
    persona.styleTransform = (text) =>
      `🛒 **Retail Risk** → ${text}`;
    return persona;
  }

  if (ind.includes("staffing")) {
    persona.label = "Staffing Agency Compliance Coach";
    persona.styleTransform = (text) =>
      `👥 **Staffing Compliance** → ${text}`;
    return persona;
  }

  // ===============================
  // DEFAULT FALLBACK
  // ===============================
  persona.label = "General Business Compliance AI";
  persona.styleTransform = (text) => `📘 ${text}`;
  return persona;
}
