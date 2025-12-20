// components/onboarding/AiWizardPanel.js
// AI Onboarding Wizard V5 — AUTOPILOT ENABLED

import { useEffect, useState } from "react";

import VendorsUploadStep from "./VendorsUploadStep";
import VendorsMapStep from "./VendorsMapStep";
import VendorsAnalyzeStep from "./VendorsAnalyzeStep";
import ContractsUploadStep from "./ContractsUploadStep";
import RulesGenerateStep from "./RulesGenerateStep";
import FixPlansStep from "./FixPlansStep";
import CompanyProfileStep from "./CompanyProfileStep";
import TeamBrokersStep from "./TeamBrokersStep";
import ReviewLaunchStep from "./ReviewLaunchStep";

export default function AiWizardPanel({
  orgId,
  step,
  stepIndex,
  totalSteps,
  wizardState,
  setWizardState,
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  if (!step) return null;

  /* ============================================================
     STEP 1 — START (AUTOPILOT TRIGGER)
  ============================================================ */
  if (step.id === "start") {
    async function startAutopilot() {
      if (!orgId || starting) return;

      setStarting(true);
      setError("");

      try {
        const res = await fetch("/api/onboarding/ai-wizard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        });

        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Failed to start onboarding");
        }

        // ✅ Advance wizard to next step
        setWizardState((prev) => ({
          ...prev,
          startedAt: Date.now(),
          currentStep: "vendors-upload",
        }));
      } catch (e) {
        setError(e.message || "Unable to start onboarding");
      } finally {
        setStarting(false);
      }
    }

    return (
      <div
        style={{
          padding: 24,
          borderRadius: 22,
          background: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(51,65,85,0.9)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
        }}
      >
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>
          Welcome to AI Onboarding
        </h2>

        <p style={{ color: "#9ca3af", marginBottom: 20 }}>
          We’ll configure your entire compliance engine automatically.
          Vendors, contracts, rules, alerts, and enforcement — hands-off.
        </p>

        {error && (
          <div style={{ color: "#f87171", marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={startAutopilot}
          disabled={starting}
          style={{
            padding: "12px 18px",
            borderRadius: 14,
            background: "linear-gradient(90deg,#38bdf8,#6366f1)",
            color: "#020617",
            fontWeight: 800,
            fontSize: 14,
            cursor: starting ? "not-allowed" : "pointer",
          }}
        >
          {starting ? "Initializing AI…" : "Start AI Onboarding →"}
        </button>
      </div>
    );
  }

  /* ============================================================
     STEP ROUTER — REAL STEPS
  ============================================================ */
  switch (step.id) {
    case "vendors-upload":
      return <VendorsUploadStep orgId={orgId} wizardState={wizardState} setWizardState={setWizardState} />;

    case "vendors-map":
      return <VendorsMapStep wizardState={wizardState} setWizardState={setWizardState} />;

    case "vendors-analyze":
      return <VendorsAnalyzeStep orgId={orgId} wizardState={wizardState} setWizardState={setWizardState} />;

    case "contracts-upload":
      return <ContractsUploadStep orgId={orgId} wizardState={wizardState} setWizardState={setWizardState} />;

    case "rules-generate":
      return <RulesGenerateStep orgId={orgId} wizardState={wizardState} setWizardState={setWizardState} />;

    case "fix-plans":
      return <FixPlansStep orgId={orgId} wizardState={wizardState} setWizardState={setWizardState} />;

    case "company-profile":
      return <CompanyProfileStep orgId={orgId} wizardState={wizardState} setWizardState={setWizardState} />;

    case "team-brokers":
      return <TeamBrokersStep wizardState={wizardState} setWizardState={setWizardState} />;

    case "review-launch":
      return <ReviewLaunchStep orgId={orgId} wizardState={wizardState} setWizardState={setWizardState} />;

    default:
      return null;
  }
}
