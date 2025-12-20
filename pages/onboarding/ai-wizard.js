// pages/onboarding/ai-wizard.js
// AI Onboarding Wizard V5 — AUTOPILOT SHELL (UUID-SAFE)

import { useMemo } from "react";
import { useOrg } from "../../context/OrgContext";
import AiWizardPanel from "../../components/onboarding/AiWizardPanel";

// Wizard step metadata (display only — NOT stateful)
const WIZARD_STEPS = [
  { id: "start", label: "Start", title: "Welcome to AI Onboarding" },
  { id: "vendors-upload", label: "Vendors CSV", title: "Upload your vendor list" },
  { id: "vendors-map", label: "Column Mapping", title: "Map vendor columns" },
  { id: "vendors-analyze", label: "Vendor Analysis", title: "AI vendor risk scan" },
  { id: "contracts-upload", label: "Contracts & COIs", title: "Upload contracts" },
  { id: "rules-generate", label: "Rules Engine", title: "Generate rule groups" },
  { id: "fix-plans", label: "Fix Plans", title: "Pre-build fix plans" },
  { id: "company-profile", label: "Company Profile", title: "Confirm company details" },
  { id: "team-brokers", label: "Team & Brokers", title: "Invite teammates & brokers" },
  { id: "review-launch", label: "Review & Launch", title: "Review and launch your system" },
];

export default function AiOnboardingWizardPage() {
  const { activeOrg } = useOrg() || {};

  // 🔑 THIS IS THE FIX — UUID ONLY
  const orgUuid = activeOrg?.uuid || null;

  const totalSteps = WIZARD_STEPS.length;

  // Display-only progress (real step comes from backend)
  const progressPercent = useMemo(() => {
    return 0; // backend-driven now
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
      }}
    >
      <div
        style={{
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: "0 0 60px rgba(15,23,42,0.95)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
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
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>
            This wizard will configure vendors, contracts, rules, alerts, and enforcement automatically.
          </p>
        </div>

        {/* Main body */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.98),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.5)",
            minHeight: 300,
          }}
        >
          {/* 🔒 AUTOPILOT WIZARD (UUID ONLY) */}
          <AiWizardPanel orgId={orgUuid} />
        </div>
      </div>
    </div>
  );
}
