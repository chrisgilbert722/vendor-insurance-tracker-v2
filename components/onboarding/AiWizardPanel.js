// components/onboarding/AiWizardPanel.js
// AI Onboarding Wizard V5 — TELEMETRY-ONLY AUTOPILOT (UUID-SAFE)

import { useState } from "react";
import { useOnboardingObserver } from "./useOnboardingObserver";

import VendorsUploadStep from "./VendorsUploadStep";
import VendorsMapStep from "./VendorsMapStep";
import VendorsAnalyzeStep from "./VendorsAnalyzeStep";
import ContractsUploadStep from "./ContractsUploadStep";
import RulesGenerateStep from "./RulesGenerateStep";
import FixPlansStep from "./FixPlansStep";
import CompanyProfileStep from "./CompanyProfileStep";
import TeamBrokersStep from "./TeamBrokersStep";
import ReviewLaunchStep from "./ReviewLaunchStep";

// UUID guard (same pattern as backend)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function AiWizardPanel({ orgId }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // 🔒 HARD GUARD — UI MUST USE UUID
  const orgUuid =
    typeof orgId === "string" && UUID_RE.test(orgId) ? orgId : null;

  // If a numeric orgId ever leaks in, fail closed (no polling, no mutation)
  if (!orgUuid) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 14,
          background: "rgba(15,23,42,0.9)",
          border: "1px solid rgba(239,68,68,0.6)",
          color: "#fecaca",
        }}
      >
        Invalid organization context. Please refresh or re-select your organization.
      </div>
    );
  }

  // 🔒 TELEMETRY SOURCE OF TRUTH (UUID ONLY)
  const { uiStep } = useOnboardingObserver({ orgId: orgUuid });

  /* ============================================================
     STEP 1 — START (BACKEND AUTOPILOT TRIGGER ONLY)
  ============================================================ */
  if (uiStep === 1) {
    async function startAutopilot() {
      if (starting) return;

      setStarting(true);
      setError("");

      try {
        const res = await fetch("/api/onboarding/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId: orgUuid }),
        });

        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Failed to start onboarding");
        }

        // ❗ NO UI ADVANCE
        // Backend controls onboarding_step
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
     STEP ROUTER — TELEMETRY-DRIVEN (NO MUTATION)
  ============================================================ */

  switch (uiStep) {
    case 2:
      return <VendorsUploadStep orgId={orgUuid} />;

    case 3:
      return <VendorsMapStep />;

    case 4:
      return <VendorsAnalyzeStep orgId={orgUuid} />;

    case 5:
      return <ContractsUploadStep orgId={orgUuid} />;

    case 6:
      return <RulesGenerateStep orgId={orgUuid} />;

    case 7:
      return <FixPlansStep orgId={orgUuid} />;

    case 8:
      return <CompanyProfileStep orgId={orgUuid} />;

    case 9:
      return <TeamBrokersStep />;

    case 10:
      return <ReviewLaunchStep orgId={orgUuid} />;

    default:
      return null;
  }
}

    default:
      return null;
  }
}
