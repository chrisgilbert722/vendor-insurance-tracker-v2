// AI Onboarding Wizard V5 — HARD FAIL-SAFE (UPLOAD RECOVERY ENABLED)
// ✅ NEVER renders blank
// ✅ NEVER deadlocks on step math
// ✅ Step 4 sticky ONLY after vendors exist
// ✅ Allows re-upload when data is missing
// ✅ Observer + backend disagreements clamped

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

// Valid renderable steps
const VALID_STEPS = [1, 2, 3, 4, 10];

// sessionStorage key per org
function step4Key(orgUuid) {
  return `verivo:onboarding:lockStep4:${orgUuid}`;
}

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

  /* ---------------------------------------------
     RESTORE STEP 4 LOCK (NON-DESTRUCTIVE)
  ---------------------------------------------- */
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
  const backendUiStep = Number.isFinite(backendStepRaw)
    ? backendStepRaw + 1
    : null;

  /* ---------------------------------------------
     COMPUTE STEP (NO TRUST)
  ---------------------------------------------- */
  const computedStep = useMemo(() => {
    return Math.max(
      1,
      forceUiStep ?? 0,
      observedStep ?? 0,
      backendUiStep ?? 0
    );
  }, [forceUiStep, observedStep, backendUiStep]);

  /* ---------------------------------------------
     LOCK STEP 4 — ONLY AFTER DATA EXISTS
  ---------------------------------------------- */
  useEffect(() => {
    const hasVendors =
      Array.isArray(wizardState?.vendorsCsv?.rows) &&
      wizardState.vendorsCsv.rows.length > 0;

    if (computedStep >= 4 && hasVendors && !lockStep4) {
      setLockStep4(true);
      try {
        sessionStorage.setItem(step4Key(orgUuid), "1");
      } catch {}
    }
  }, [computedStep, lockStep4, orgUuid, wizardState]);

  /* ---------------------------------------------
     FINAL SAFE STEP DECISION
  ---------------------------------------------- */
  const safeStep = useMemo(() => {
    const hasVendors =
      Array.isArray(wizardState?.vendorsCsv?.rows) &&
      wizardState.vendorsCsv.rows.length > 0;

    // 🔓 Allow re-upload if no vendors exist
    if (!hasVendors) return 2;

    // 🔒 Sticky gate only AFTER vendors exist
    if (lockStep4) return 4;

    if (VALID_STEPS.includes(computedStep)) return computedStep;
    return 2;
  }, [computedStep, lockStep4, wizardState]);

  /* ---------------------------------------------
     RENDER
  ---------------------------------------------- */
  let content;

  switch (safeStep) {
    case 1:
      content = (
        <button
          onClick={async () => {
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
          }}
        >
          {starting ? "Starting…" : "Start Compliance Setup"}
        </button>
      );
      break;

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
          setForceUiStep={setForceUiStep} // ✅ REQUIRED so green button can advance
        />
      );
      break;

    case 10:
      content = (
        <ReviewLaunchStep
          orgId={orgUuid}
          wizardState={wizardState}
          onComplete={async () => {
            await fetch("/api/onboarding/complete");
            router.replace("/dashboard");
          }}
        />
      );
      break;

    default:
      content = (
        <div style={{ color: "#9ca3af", padding: 16 }}>
          Recovering onboarding…
        </div>
      );
  }

  return (
    <>
      {showMappingToast && safeStep < 4 && (
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
      {safeStep < 4 && <OnboardingActivityFeed />}
    </>
  );
}
