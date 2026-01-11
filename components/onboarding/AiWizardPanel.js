// AI Onboarding Wizard V5 — TELEMETRY-ONLY AUTOPILOT (BUILD SAFE)
// Property Management copy pass (Day 3)
// ✅ Autonomous mapping + auto-skip + persistence + reuse toast
// ✅ LOCKED FUNNEL: Step 4 is activation wall
// ✅ Activity feed hidden at Step 4
// ✅ Step 4 is STICKY (UI never goes backwards once reached)

import { useEffect, useMemo, useState } from "react";
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
  const [error, setError] = useState("");
  const [wizardState, setWizardState] = useState({});
  const [forceUiStep, setForceUiStep] = useState(null);
  const [showMappingToast, setShowMappingToast] = useState(false);

  // 🔒 Once Step 4 is reached, the UI must never show Steps 1–3 again
  const [lockStep4, setLockStep4] = useState(false);

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
            mapping: json.mapping,
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
    return <div style={{ color: "#fecaca" }}>Organization not found.</div>;
  }

  const { uiStep: observedStep } = useOnboardingObserver({ orgId: orgUuid });

  // ✅ Always take the highest step we know about (prevents UI regressions)
  const computedStep = useMemo(() => {
    const a = typeof forceUiStep === "number" ? forceUiStep : 0;
    const b = typeof observedStep === "number" ? observedStep : 1;
    return Math.max(a, b, 1);
  }, [forceUiStep, observedStep]);

  // 🔒 Step 4 stickiness: once reached, lock UI to >= 4 for this session
  useEffect(() => {
    if (computedStep >= 4 && !lockStep4) setLockStep4(true);
  }, [computedStep, lockStep4]);

  const effectiveStep = lockStep4 ? Math.max(computedStep, 4) : computedStep;

  // Don't show mapping toast once we're on the activation wall
  const shouldShowToast = showMappingToast && effectiveStep < 4;

  let content = null;

  /* ============================================================
     STEP ROUTER
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
        // 🔒 FINAL LOCKED STEP — activation wall lives INSIDE VendorsAnalyzeStep
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
      {shouldShowToast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid rgba(56,189,248,0.55)",
            background: "rgba(15,23,42,0.96)",
            color: "#e0f2fe",
            fontSize: 12,
            boxShadow: "0 0 20px rgba(56,189,248,0.25)",
            zIndex: 9999,
          }}
        >
          Using your previous vendor mapping
        </div>
      )}

      {content}
      {error && <div style={{ color: "#f87171" }}>{error}</div>}

      {/* 🔒 Activity feed ONLY before Step 4 */}
      {effectiveStep < 4 && <OnboardingActivityFeed />}
    </>
  );
}
