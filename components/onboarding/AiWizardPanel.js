// AI Onboarding Wizard V5 — TELEMETRY-ONLY AUTOPILOT (BUILD SAFE)
// Property Management copy pass (Day 3)
// ✅ Autonomous mapping + auto-skip + persistence + reuse toast
// ✅ FIX: Normalize AI mapping shape for Step 4
// ✅ LOCK: Step 4 includes “Activate Automation” paywall CTA

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useOnboardingObserver } from "./useOnboardingObserver";
import OnboardingActivityFeed from "./OnboardingActivityFeed";

import VendorsUploadStep from "./VendorsUploadStep";
import VendorsMapStep from "./VendorsMapStep";
import VendorsAnalyzeStep from "./VendorsAnalyzeStep";
import ReviewLaunchStep from "./ReviewLaunchStep";

// UUID guard
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/* -------------------------------------------------
   HELPERS
-------------------------------------------------- */

// Convert AI mapping objects → plain column strings
function normalizeMapping(rawMapping = {}) {
  const out = {};
  for (const key in rawMapping) {
    const val = rawMapping[key];
    if (typeof val === "string") out[key] = val;
    else if (val?.column) out[key] = val.column;
  }
  return out;
}

// Keep confidence metadata separate (optional UI use)
function extractConfidence(rawMapping = {}) {
  const out = {};
  for (const key in rawMapping) {
    if (rawMapping[key]?.confidence) {
      out[key] = rawMapping[key].confidence;
    }
  }
  return out;
}

export default function AiWizardPanel({ orgId }) {
  const router = useRouter();

  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");

  const [wizardState, setWizardState] = useState({});
  const [forceUiStep, setForceUiStep] = useState(null);
  const [showMappingToast, setShowMappingToast] = useState(false);

  const orgUuid =
    typeof orgId === "string" && UUID_RE.test(orgId) ? orgId : null;

  /* -------------------------------------------------
     LOAD SAVED MAPPING (ONCE)
  -------------------------------------------------- */
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
            mapping: json.mapping, // already normalized
            mappingSource: "persisted",
          },
        }));

        setShowMappingToast(true);
        setTimeout(() => setShowMappingToast(false), 3000);
      } catch {
        // silent
      }
    }

    loadSavedMapping();
    return () => (mounted = false);
  }, [orgUuid]);

  if (!orgUuid) {
    return (
      <div style={{ color: "#fecaca" }}>
        We couldn’t load your organization.
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
      } catch {
        setError("Could not start onboarding.");
      } finally {
        setStarting(false);
      }
    };

    content = (
      <button onClick={startAutopilot}>
        {starting ? "Starting…" : "Start Compliance Setup"}
      </button>
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
            onUploadSuccess={({ headers, rows, mapping, autoSkip }) => {
              const normalized = normalizeMapping(mapping);
              const confidence = extractConfidence(mapping);

              setWizardState({
                vendorsCsv: {
                  headers,
                  rows,
                  mapping: normalized,
                  confidence,
                },
              });

              if (autoSkip) {
                fetch("/api/onboarding/save-mapping", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mapping: normalized }),
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
          <>
            <VendorsAnalyzeStep
              orgId={orgUuid}
              wizardState={wizardState}
              setWizardState={setWizardState}
            />

            {/* ============================================================
               LOCKED PAYWALL HANDOFF (STEP 4 TERMINAL)
               - Do NOT auto-redirect
               - Explicit CTA converts best
            ============================================================ */}
            <div
              style={{
                marginTop: 22,
                padding: 18,
                borderRadius: 18,
                background: "rgba(2,6,23,0.55)",
                border: "1px solid rgba(56,189,248,0.25)",
              }}
            >
              <div style={{ color: "#e5e7eb", fontWeight: 800, fontSize: 14 }}>
                Preview complete
              </div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                Automation is locked in preview mode. Activate to start your 14-day
                trial and enable execution.
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 14,
                }}
              >
                <button
                  onClick={() => router.push("/billing/activate")}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 999,
                    border: "1px solid rgba(56,189,248,0.9)",
                    background:
                      "linear-gradient(90deg,rgba(56,189,248,0.95),rgba(99,102,241,0.95))",
                    color: "#020617",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Activate Automation
                </button>
              </div>

              <div
                style={{
                  color: "#9ca3af",
                  fontSize: 12,
                  marginTop: 8,
                  textAlign: "right",
                }}
              >
                14-day trial • $499/mo after • Cancel anytime • Card required
              </div>
            </div>
          </>
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
        <div style={{ position: "fixed", top: 20, right: 20 }}>
          Using your previous vendor mapping
        </div>
      )}

      {content}
      {error && <div style={{ color: "#f87171" }}>{error}</div>}
      <OnboardingActivityFeed />
    </>
  );
}
