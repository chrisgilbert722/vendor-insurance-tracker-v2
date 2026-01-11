// AI Onboarding Wizard V5 — TELEMETRY-ONLY AUTOPILOT (BUILD SAFE)
// Property Management copy pass (Day 3)
// ✅ Autonomous mapping + auto-skip + persistence + reuse toast
// ✅ LOCKED FUNNEL: Step 4 is activation wall
// ✅ Activity feed hidden at Step 4
// ✅ Step 4 is STICKY (UI never goes backwards once reached)
// ✅ Step 4 lock is persisted per-org (sessionStorage) to survive remounts
// ✅ Step 1 now renders a visible panel (prevents "blank gradient" confusion)

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

// sessionStorage key per org
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

  /* -------------------------------------------------
     PERSISTED STEP 4 LOCK (SESSION)
  -------------------------------------------------- */
  useEffect(() => {
    if (!orgUuid) return;
    try {
      const v = sessionStorage.getItem(step4Key(orgUuid));
      if (v === "1") setLockStep4(true);
    } catch {
      // ignore
    }
  }, [orgUuid]);

  // If org is invalid, show safe message
  if (!orgUuid) {
    return <div style={{ color: "#fecaca" }}>Organization not found.</div>;
  }

  const { uiStep: observedStep, status } = useOnboardingObserver({ orgId: orgUuid });

  // backend onboarding_step is 0-based; UI is 1-based.
  const backendStepRaw = Number(status?.onboardingStep ?? NaN);
  const statusUiStep =
    Number.isFinite(backendStepRaw) ? Math.max(1, Math.min(10, backendStepRaw + 1)) : null;

  // ✅ Always take the highest step we know about (prevents UI regressions)
  const computedStep = useMemo(() => {
    const a = typeof forceUiStep === "number" ? forceUiStep : 0;
    const b = typeof observedStep === "number" ? observedStep : 1;
    const c = typeof statusUiStep === "number" ? statusUiStep : 1;
    return Math.max(a, b, c, 1);
  }, [forceUiStep, observedStep, statusUiStep]);

  // 🔒 Step 4 stickiness: once reached, lock UI to >= 4 for this session
  useEffect(() => {
    if (computedStep >= 4 && !lockStep4) {
      setLockStep4(true);
      try {
        sessionStorage.setItem(step4Key(orgUuid), "1");
      } catch {
        // ignore
      }
    }
  }, [computedStep, lockStep4, orgUuid]);

  const effectiveStep = lockStep4 ? Math.max(computedStep, 4) : computedStep;

  // Don't show mapping toast once we're on the activation wall
  const shouldShowToast = showMappingToast && effectiveStep < 4;

  let content = null;

  /* ============================================================
     STEP ROUTER
  ============================================================ */

  // Visible panel wrapper used for Step 1 + fallback
  const panelShell = (inner) => (
    <div
      style={{
        borderRadius: 22,
        padding: 22,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        border: "1px solid rgba(148,163,184,0.45)",
        boxShadow: "0 0 60px rgba(15,23,42,0.75)",
        color: "#e5e7eb",
      }}
    >
      {inner}
    </div>
  );

  // If the observer hasn't stabilized yet, show a real loading panel (prevents "blank")
  if (!Number.isFinite(effectiveStep) || effectiveStep < 1) {
    content = panelShell(
      <div style={{ color: "#9ca3af" }}>Resolving onboarding state…</div>
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

    content = panelShell(
      <>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.75)",
            marginBottom: 8,
          }}
        >
          Step 1 • Compliance Setup
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
          Start Compliance Setup
        </div>

        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>
          We’ll prepare your vendor compliance system and guide you through the upload.
        </div>

        <button
          onClick={startAutopilot}
          disabled={starting}
          style={{
            padding: "12px 18px",
            borderRadius: 999,
            border: "1px solid rgba(56,189,248,0.75)",
            background:
              "radial-gradient(circle at top left,rgba(56,189,248,0.35),rgba(15,23,42,0.92))",
            color: "#e0f2fe",
            fontWeight: 900,
            cursor: starting ? "not-allowed" : "pointer",
          }}
        >
          {starting ? "Starting…" : "Start Compliance Setup"}
        </button>

        {error && (
          <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}
      </>
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
        // Fallback: show a visible panel instead of "nothing"
        content = panelShell(
          <div style={{ color: "#9ca3af" }}>
            Loading onboarding step…
          </div>
        );
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

      {/* 🔒 Activity feed ONLY before Step 4 */}
      {effectiveStep < 4 && <OnboardingActivityFeed />}
    </>
  );
}
