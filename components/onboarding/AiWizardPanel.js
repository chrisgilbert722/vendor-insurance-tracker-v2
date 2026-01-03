// AI Onboarding Wizard V5 — TELEMETRY-ONLY AUTOPILOT (BUILD SAFE)
// Property Management copy pass (Day 3)

import { useState } from "react";
import { useRouter } from "next/router";
import { useOnboardingObserver } from "./useOnboardingObserver";
import OnboardingActivityFeed from "./OnboardingActivityFeed";

import VendorsUploadStep from "./VendorsUploadStep";
import VendorsMapStep from "./VendorsMapStep";
import VendorsAnalyzeStep from "./VendorsAnalyzeStep";
import ContractsUploadStep from "./ContractsUploadStep";
import RulesGenerateStep from "./RulesGenerateStep";
import FixPlansStep from "./FixPlansStep";
import CompanyProfileStep from "./CompanyProfileStep";
import TeamBrokersStep from "./TeamBrokersStep";
import ReviewLaunchStep from "./ReviewLaunchStep";

// UUID guard
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function AiWizardPanel({ orgId }) {
  const router = useRouter();

  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  // Enforce UUID-only orgId
  const orgUuid =
    typeof orgId === "string" && UUID_RE.test(orgId) ? orgId : null;

  // Fail closed if org context is invalid
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
        We couldn’t load your property portfolio.
        <br />
        Please refresh or re-select your organization.
      </div>
    );
  }

  // Telemetry observer (UUID only)
  const { uiStep } = useOnboardingObserver({ orgId: orgUuid });

  // 🔑 CRITICAL FIX:
  // If onboarding has never started, default to STEP 1
  const effectiveStep = uiStep ?? 1;

  let content = null;

  /* ============================================================
     STEP 1 — START (AUTOPILOT TRIGGER)
  ============================================================ */
  if (effectiveStep === 1) {
    const startAutopilot = async () => {
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
      } catch (e) {
        setError(
          e.message ||
            "We couldn’t start your compliance setup. Please try again."
        );
      } finally {
        setStarting(false);
      }
    };

    content = (
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
          Set Up Vendor Insurance Compliance
        </h2>

        <p style={{ color: "#9ca3af", marginBottom: 20 }}>
          We’ll automatically analyze your vendors, contracts, and insurance
          requirements across your properties — then prepare fix plans,
          renewal reminders, and audit-ready reports.
        </p>

        <p style={{ color: "#9ca3af", marginBottom: 20 }}>
          You can safely leave this page while setup runs in the background.
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
          {starting
            ? "Analyzing your vendor compliance…"
            : "Start Compliance Setup →"}
        </button>
      </div>
    );
  } else {
    /* ============================================================
       STEP ROUTER — TELEMETRY ONLY
    ============================================================ */
    switch (effectiveStep) {
      case 2:
        content = <VendorsUploadStep orgId={orgUuid} />;
        break;
      case 3:
        content = <VendorsMapStep />;
        break;
      case 4:
        content = <VendorsAnalyzeStep orgId={orgUuid} />;
        break;
      case 5:
        content = <ContractsUploadStep orgId={orgUuid} />;
        break;
      case 6:
        content = <RulesGenerateStep orgId={orgUuid} />;
        break;
      case 7:
        content = <FixPlansStep orgId={orgUuid} />;
        break;
      case 8:
        content = <CompanyProfileStep orgId={orgUuid} />;
        break;
      case 9:
        content = <TeamBrokersStep />;
        break;

      /* ============================================================
         STEP 10 — FINALIZE + REDIRECT
      ============================================================ */
      case 10:
        content = (
          <ReviewLaunchStep
            orgId={orgUuid}
            onComplete={async () => {
              if (finishing) return;

              setFinishing(true);

              try {
                // ✅ Mark onboarding complete (server truth)
                await fetch("/api/onboarding/complete", {
                  method: "POST",
                });

                // 🚀 App / Layout gate now allows dashboard
                router.replace("/dashboard");
              } catch (err) {
                console.error("Onboarding completion failed:", err);
                setError("We couldn’t finish setup. Please try again.");
                setFinishing(false);
              }
            }}
          />
        );
        break;

      default:
        content = null;
    }
  }

  return (
    <>
      {content}

      {error && (
        <div style={{ color: "#f87171", marginTop: 16 }}>
          {error}
        </div>
      )}

      {/* 🔥 LIVE AI ACTIVITY FEED (Backend-driven) */}
      <OnboardingActivityFeed />
    </>
  );
}
