// AI Onboarding Wizard V5 — HARD FAIL-SAFE (FINAL FIXED)
// ✅ NEVER renders blank
// ✅ NEVER deadlocks
// ✅ Step 4 sticky until Finish
// ✅ Explicit Finish ALWAYS wins

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useOnboardingObserver } from "./useOnboardingObserver";
import OnboardingActivityFeed from "./OnboardingActivityFeed";

import VendorsUploadStep from "./VendorsUploadStep";
import VendorsMapStep from "./VendorsMapStep";
import VendorsAnalyzeStep from "./VendorsAnalyzeStep";
import ReviewLaunchStep from "./ReviewLaunchStep";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALID_STEPS = [1, 2, 3, 4, 10];

function step4Key(orgUuid) {
  return `verivo:onboarding:lockStep4:${orgUuid}`;
}

export default function AiWizardPanel({ orgId }) {
  const router = useRouter();

  const [wizardState, setWizardState] = useState({});
  const [forceUiStep, setForceUiStep] = useState(null);
  const [lockStep4, setLockStep4] = useState(false);
  const [error, setError] = useState("");

  const orgUuid =
    typeof orgId === "string" && UUID_RE.test(orgId) ? orgId : null;

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

  const computedStep = useMemo(() => {
    return Math.max(
      1,
      forceUiStep ?? 0,
      observedStep ?? 0,
      backendUiStep ?? 0
    );
  }, [forceUiStep, observedStep, backendUiStep]);

  /* ---------------------------------------------
     LOCK STEP 4 AFTER VENDORS EXIST
  ---------------------------------------------- */
  useEffect(() => {
    const hasVendors =
      Array.isArray(wizardState?.vendorsCsv?.rows) &&
      wizardState.vendorsCsv.rows.length > 0;

    if (hasVendors && !lockStep4) {
      setLockStep4(true);
      try {
        sessionStorage.setItem(step4Key(orgUuid), "1");
      } catch {}
    }
  }, [wizardState, lockStep4, orgUuid]);

  /* ---------------------------------------------
     FINAL SAFE STEP (FIXED)
  ---------------------------------------------- */
  const safeStep = useMemo(() => {
    const hasVendors =
      Array.isArray(wizardState?.vendorsCsv?.rows) &&
      wizardState.vendorsCsv.rows.length > 0;

    // 🔥 EXPLICIT FINISH ALWAYS WINS
    if (forceUiStep === 10) return 10;

    // Allow re-upload if no vendors
    if (!hasVendors) return 2;

    // Sticky analysis until Finish
    if (lockStep4) return 4;

    if (VALID_STEPS.includes(computedStep)) return computedStep;
    return 2;
  }, [computedStep, lockStep4, wizardState, forceUiStep]);

  /* ---------------------------------------------
     RENDER
  ---------------------------------------------- */
  let content;

  switch (safeStep) {
    case 2:
      content = (
        <VendorsUploadStep
          orgId={orgUuid}
          onUploadSuccess={({ headers, rows }) => {
            setWizardState({
              vendorsCsv: { headers, rows },
            });
            setForceUiStep(4);
          }}
        />
      );
      break;

    case 4:
      content = (
        <VendorsAnalyzeStep
          orgId={orgUuid}
          wizardState={wizardState}
          setWizardState={setWizardState}
          setForceUiStep={setForceUiStep}
        />
      );
      break;

    case 10:
      content = (
        <ReviewLaunchStep
          orgId={orgUuid}
          wizardState={wizardState}
          onComplete={async () => {
            await fetch("/api/onboarding/complete", { method: "POST" });
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
      {content}
      {error && <div style={{ color: "#f87171" }}>{error}</div>}
      {safeStep < 4 && <OnboardingActivityFeed />}
    </>
  );
}
