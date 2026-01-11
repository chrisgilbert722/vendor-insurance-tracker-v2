// AI Onboarding Wizard V5 — TELEMETRY-ONLY AUTOPILOT (BUILD SAFE)
// Property Management copy pass (Day 3)
// ✅ Autonomous mapping + auto-skip + persistence + reuse toast
// ✅ LOCKED FUNNEL: Step 4 is activation wall
// ✅ Activity feed hidden at Step 4
// ✅ Step 4 is STICKY (UI never goes backwards once reached)
// ✅ Step 4 lock is persisted per-org (sessionStorage) to survive remounts
// ✅ FIX: Never downgrade to loading once Step 4 is locked

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

function normalizeMapping(rawMapping = {}) {
  const out = {};
  for (const key in rawMapping) {
    const val = rawMapping[key];
    if (typeof val === "string") out[key] = val;
    else if (val?.column) out[key] = val.column;
  }
  return out;
}

function extractConfidence(rawMapping = {}) {
  const out = {};
  for (const key in rawMapping) {
    if (rawMapping[key]?.confidence) {
      out[key] = rawMapping[key].confidence;
    }
  }
  return out;
}

function step4Key(orgUuid) {
  return `verivo:onboarding:lockStep4:${orgUuid}`;
}

export default function AiWizardPanel({ orgId }) {
  const router = useRouter();

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [wizardState, setWizardState] = useState({});
  const [forceUiStep, setForceUiStep] = useState(null);
  const [showMappingToast, setShowMappingToast] = useState(false);
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
      } catch {}
    }

    loadSavedMapping();
    return () => (mounted = false);
  }, [orgUuid]);

  /* -------------------------------------------------
     RESTORE STEP 4 LOCK
  -------------------------------------------------- */
  useEffect(() => {
    if (!orgUuid) return;
    try {
      if (sessionStorage.getItem(step4Key(orgUuid)) === "1") {
        setLockStep4(true);
      }
    } catch {}
  }, [orgUuid]);

  if (!orgUuid) {
    return <div style={{ color: "#fecaca" }}>Organization not found.</div>;
  }

  const { uiStep: observedStep, status } = useOnboardingObserver({
    orgId: orgUuid,
  });

  const backendStepRaw = Number(status?.onboardingStep ?? NaN);
  const statusUiStep =
    Number.isFinite(backendStepRaw)
      ? Math.max(1, Math.min(10, backendStepRaw + 1))
      : null;

  const computedStep = useMemo(() => {
    const a = typeof forceUiStep === "number" ? forceUiStep : 0;
    const b = typeof observedStep === "number" ? observedStep : 1;
    const c = typeof statusUiStep === "number" ? statusUiStep : 1;
    return Math.max(a, b, c, 1);
  }, [forceUiStep, observedStep, statusUiStep]);

  useEffect(() => {
    if (computedStep >= 4 && !lockStep4) {
      setLockStep4(true);
      try {
        sessionStorage.setItem(step4Key(orgUuid), "1");
      } catch {}
    }
  }, [computedStep, lockStep4, orgUuid]);

  const effectiveStep = lockStep4 ? Math.max(computedStep, 4) : computedStep;
  const shouldShowToast = showMappingToast && effectiveStep < 4;

  let content = null;

  /* ============================================================
     🔒 CRITICAL FIX — HOLD STEP 4 IF OBSERVER BLIPS
  ============================================================ */

  if ((!Number.isFinite(effectiveStep) || effectiveStep < 1) && lockStep4) {
    content = (
      <VendorsAnalyzeStep
        orgId={orgUuid}
        wizardState={wizardState}
        setWizardState={setWizardState}
      />
    );
  } else if (!Number.isFinite(effectiveStep) || effectiveStep < 1) {
    content = (
      <div style={{ color: "#9ca3af", padding: 16 }}>
        Loading onboarding step…
      </div>
    );
  } else if (effectiveStep === 1) {
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
                vendorsCsv: { headers, rows, mapping: normalized, confidence },
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
      {effectiveStep < 4 && <OnboardingActivityFeed />}
    </>
  );
}
