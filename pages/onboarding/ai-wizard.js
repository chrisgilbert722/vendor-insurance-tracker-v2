// pages/onboarding/ai-wizard.js
// AI Onboarding Wizard V5 — 10-Minute Org Setup (Shell / Step Manager)

import { useState, useMemo } from "react";
import { useOrg } from "../../context/OrgContext";
import AiWizardPanel from "../../components/onboarding/AiWizardPanel";

// Central definition of the 10-step AI wizard flow
const WIZARD_STEPS = [
  {
    id: "start",
    label: "Start",
    title: "Welcome to AI Onboarding",
    description: "We’ll configure your entire compliance engine in about 10 minutes.",
  },
  {
    id: "vendors-upload",
    label: "Vendors CSV",
    title: "Upload your vendor list",
    description: "Upload a CSV of all vendors so AI can analyze coverage and risk.",
  },
  {
    id: "vendors-map",
    label: "Column Mapping",
    title: "Map vendor columns",
    description: "Tell the AI what each CSV column represents (name, email, carrier, etc.).",
  },
  {
    id: "vendors-analyze",
    label: "Vendor Analysis",
    title: "AI vendor risk scan",
    description: "AI analyzes vendors, flags missing data, and detects obvious coverage gaps.",
  },
  {
    id: "contracts-upload",
    label: "Contracts & COIs",
    title: "Upload contracts and sample COIs",
    description:
      "Upload contracts, endorsements, and sample COIs so AI can extract requirements.",
  },
  {
    id: "rules-generate",
    label: "Rules Engine",
    title: "Generate rule groups",
    description:
      "AI proposes rules, severities, and coverage thresholds based on your documents.",
  },
  {
    id: "fix-plans",
    label: "Fix Plans",
    title: "Pre-build fix plans",
    description:
      "AI drafts vendor fix plans and email templates for common coverage gaps.",
  },
  {
    id: "company-profile",
    label: "Company Profile",
    title: "Confirm company details",
    description:
      "Review your organization info so emails, PDFs, and branding are correct.",
  },
  {
    id: "team-brokers",
    label: "Team & Brokers",
    title: "Invite teammates & brokers",
    description:
      "Give your internal team and external brokers access to upload and manage COIs.",
  },
  {
    id: "review-launch",
    label: "Review & Launch",
    title: "Review and launch your system",
    description:
      "AI shows a summary of vendors, rules, alerts, and emails before you go live.",
  },
];

export default function AiOnboardingWizardPage() {
  const { activeOrgId } = useOrg() || {};
  const [stepIndex, setStepIndex] = useState(0);

  // Global wizard state stub (we’ll fill this in future steps)
  const [wizardState, setWizardState] = useState({
    vendorsCsv: null,
    mappedColumns: {},
    vendorsPreview: [],
    contracts: [],
    ruleDrafts: [],
    fixPlans: [],
    companyProfile: {},
    teamInvites: [],
    launchSummary: null,
  });

  const currentStep = WIZARD_STEPS[stepIndex];
  const totalSteps = WIZARD_STEPS.length;

  const progressPercent = useMemo(() => {
    if (totalSteps <= 1) return 0;
    return Math.round((stepIndex / (totalSteps - 1)) * 100);
  }, [stepIndex, totalSteps]);

  function goNext() {
    setStepIndex((idx) => Math.min(idx + 1, totalSteps - 1));
  }

  function goBack() {
    setStepIndex((idx) => Math.max(idx - 1, 0));
  }

  const atFirstStep = stepIndex === 0;
  const atLastStep = stepIndex === totalSteps - 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
      }}
    >
      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            0 0 80px rgba(15,23,42,0.9),
            inset 0 0 22px rgba(15,23,42,0.9)
          `,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.7))",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#9ca3af",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              AI Onboarding Wizard
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#38bdf8",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              10-Minute Setup
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Let AI configure{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              your entire compliance engine
            </span>
            .
          </h1>

          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#9ca3af",
              maxWidth: 640,
            }}
          >
            This wizard will ingest your vendors, contracts, and policies to
            generate rule groups, coverage requirements, alerts, and
            communication templates — without weeks of manual setup.
          </p>
        </div>

        {/* Main Body: Stepper + Active Panel */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,0.9fr) minmax(0,2.1fr)",
            gap: 20,
          }}
        >
          {/* LEFT: Stepper */}
          <div
            style={{
              borderRadius: 20,
              padding: 14,
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(51,65,85,0.9)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 8,
              }}
            >
              Setup Progress
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "#020617",
                marginBottom: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg,#22c55e,#4ade80,#a3e635)",
                  transition: "width 200ms ease-out",
                }}
              />
            </div>

            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 10 }}>
              Step {stepIndex + 1} of {totalSteps} · {progressPercent}% complete
            </div>

            {/* Step list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 6,
              }}
            >
              {WIZARD_STEPS.map((step, idx) => {
                const isActive = idx === stepIndex;
                const isDone = idx < stepIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setStepIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      textAlign: "left",
                      borderRadius: 999,
                      padding: "6px 10px",
                      border: isActive
                        ? "1px solid rgba(56,189,248,0.9)"
                        : "1px solid rgba(31,41,55,0.9)",
                      background: isActive
                        ? "radial-gradient(circle at top left,#0f172a,#020617)"
                        : "rgba(15,23,42,0.95)",
                      cursor: "pointer",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "999px",
                        border: "1px solid rgba(148,163,184,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: isDone ? "#22c55e" : "#e5e7eb",
                        background: isDone
                          ? "rgba(22,163,74,0.15)"
                          : "transparent",
                      }}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: isActive ? "#e5e7eb" : "#9ca3af",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Active step panel (delegated to AiWizardPanel for now) */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background:
                "radial-gradient(circle at top right,rgba(15,23,42,0.98),rgba(15,23,42,1))",
              border: "1px solid rgba(148,163,184,0.5)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
              minHeight: 260,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                {currentStep.label}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {currentStep.title}
              </h2>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: 13,
                  color: "#9ca3af",
                }}
              >
                {currentStep.description}
              </p>
            </div>

            {/* For Step 1, we still delegate main body to AiWizardPanel.
               Later we can wire each step into this container via props. */}
            <div style={{ flex: 1, marginTop: 8 }}>
              <AiWizardPanel
                orgId={activeOrgId}
                step={currentStep}
                stepIndex={stepIndex}
                totalSteps={totalSteps}
                wizardState={wizardState}
                setWizardState={setWizardState}
              />
            </div>

            {/* Navigation buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={goBack}
                disabled={atFirstStep}
                style={{
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(75,85,99,0.9)",
                  background: atFirstStep
                    ? "rgba(15,23,42,0.6)"
                    : "rgba(15,23,42,0.95)",
                  color: atFirstStep ? "#6b7280" : "#e5e7eb",
                  fontSize: 12,
                  cursor: atFirstStep ? "not-allowed" : "pointer",
                }}
              >
                ← Back
              </button>

              <button
                type="button"
                onClick={goNext}
                style={{
                  borderRadius: 999,
                  padding: "8px 16px",
                  border: "1px solid rgba(56,189,248,0.9)",
                  background: atLastStep
                    ? "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)"
                    : "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                  color: "#e5f2ff",
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: 120,
                  cursor: "pointer",
                  boxShadow: atLastStep
                    ? "0 0 18px rgba(34,197,94,0.55)"
                    : "0 0 18px rgba(59,130,246,0.55)",
                }}
              >
                {atLastStep ? "Launch System →" : "Next Step →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
