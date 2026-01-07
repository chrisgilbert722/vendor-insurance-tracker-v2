// AI Onboarding Wizard V5 — TELEMETRY-ONLY AUTOPILOT (BUILD SAFE)
// Property Management copy pass (Day 3)
// ✅ Autonomous mapping + auto-skip + persistence + reuse toast

import { useEffect, useState } from "react";
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

  // 🔑 WIZARD STATE
  const [wizardState, setWizardState] = useState({});

  // 🔥 LOCAL UI OVERRIDE
  const [forceUiStep, setForceUiStep] = useState(null);

  // 🔔 Mapping reuse toast
  const [showMappingToast, setShowMappingToast] = useState(false);

  const orgUuid =
    typeof orgId === "string" && UUID_RE.test(orgId) ? orgId : null;

  /* ------------------------------------------------------------
     LOAD SAVED MAPPING (ONCE)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!orgUuid) return;

    let mounted = true;

    async function loadSavedMapping() {
      try {
        const res = await fetch("/api/onboarding/get-mapping");
        const json = await res.json();
        if (!mounted || !json?.ok || !json.mapping) return;

        setWizardState((prev) => ({
          ...prev,
          vendorsCsv: {
            ...(prev.vendorsCsv || {}),
            mapping: json.mapping,
            source: "persisted",
          },
        }));

        // 🔔 Show reuse toast
        setShowMappingToast(true);
        setTimeout(() => setShowMappingToast(false), 3000);
      } catch {
        // Silent — reuse is an optimization
      }
    }

    loadSavedMapping();
    return () => {
      mounted = false;
    };
  }, [orgUuid]);

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

  const { uiStep: observedStep } = useOnboardingObserver({ orgId: orgUuid });
  const effectiveStep = forceUiStep ?? observedStep ?? 1;

  let content = null;

  /* ============================================================
     STEP 1 — START
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
        if (!json.ok) throw new Error(json.error);

        setForceUiStep(2);
      } catch (e) {
        setError("We couldn’t start your compliance setup.");
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
        }}
      >
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>
          Set Up Vendor Insurance Compliance
        </h2>

        <p style={{ color: "#9ca3af", marginBottom: 20 }}>
          Upload your vendor insurance file. AI will handle the rest.
        </p>

        {error && <div style={{ color: "#f87171" }}>{error}</div>}

        <button
          onClick={startAutopilot}
          disabled={starting}
          style={{
            padding: "12px 18px",
            borderRadius: 14,
            background: "linear-gradient(90deg,#38bdf8,#6366f1)",
            color: "#020617",
            fontWeight: 800,
          }}
        >
          {starting ? "Starting…" : "Start Compliance Setup →"}
        </button>
      </div>
    );
  } else {
    /* ============================================================
       STEP ROUTER
    ============================================================ */
    switch (effectiveStep) {
      case 2:
        content = (
          <VendorsUploadStep
            orgId={orgUuid}
            onUploadSuccess={async ({ headers, rows, mapping, autoSkip }) => {
              setWizardState((prev) => ({
                ...prev,
                vendorsCsv: { headers, rows, mapping },
              }));

              if (autoSkip) {
                fetch("/api/onboarding/save-mapping", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mapping }),
                }).catch(() => {});
                setForceUiStep(4);
              } else {
                setForceUiStep(3);
              }
            }}
          />
        );
        break;

      case 3:
        content = (
          <VendorsMapStep
            wizardState={wizardState}
            setWizardState={setWizardState}
            onComplete={() => setForceUiStep(4)}
          />
        );
        break;

      case 4:
        content = (
          <VendorsAnalyzeStep
            orgId={orgUuid}
            wizardState={wizardState}
            setWizardState={setWizardState}
          />
        );
        break;

      case 10:
        content = (
          <ReviewLaunchStep
            orgId={orgUuid}
            onComplete={async () => {
              setFinishing(true);
              await fetch("/api/onboarding/complete");
              router.replace("/dashboard");
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
      {showMappingToast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: "10px 16px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(56,189,248,0.5)",
            color: "#7dd3fc",
            fontSize: 13,
            zIndex: 9999,
            boxShadow: "0 0 20px rgba(56,189,248,0.4)",
          }}
        >
          Using your previous vendor mapping
        </div>
      )}

      {content}

      {error && (
        <div style={{ color: "#f87171", marginTop: 16 }}>{error}</div>
      )}

      <OnboardingActivityFeed />
    </>
  );
}
