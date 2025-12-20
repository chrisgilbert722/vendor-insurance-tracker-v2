import { useEffect, useRef, useState } from "react";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Telemetry-only onboarding observer
 * - Polls /api/onboarding/status
 * - Mirrors organizations.onboarding_step (INT)
 * - NEVER mutates backend
 * - Forward-only UI progression
 */
export function useOnboardingObserver({ orgId, pollMs = 1200 }) {
  const [uiStep, setUiStep] = useState(1); // Wizard is 1-based
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const lastStepRef = useRef(1);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!orgId) return;

    let alive = true;

    async function tick() {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/onboarding/status?orgId=${encodeURIComponent(orgId)}`,
          {
            signal: abortRef.current.signal,
            headers: { "cache-control": "no-cache" },
          }
        );

        const json = await res.json();
        if (!alive) return;

        // Skip-safe API — ok:false is expected sometimes
        if (!json?.ok) {
          setStatus(json);
          setLoading(false);
          return;
        }

        setStatus(json);

        // DB: onboarding_step is 0-based
        // UI: wizard is 1-based
        const backendStep = Number(json.onboardingStep || 0);
        const nextUiStep = clamp(backendStep + 1, 1, 10);

        // Forward-only movement
        if (nextUiStep > lastStepRef.current) {
          lastStepRef.current = nextUiStep;
          setUiStep(nextUiStep);
        } else if (lastStepRef.current === 1) {
          // Initial sync if backend already advanced
          lastStepRef.current = nextUiStep;
          setUiStep(nextUiStep);
        }

        setLoading(false);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;

        setError("Onboarding sync failed.");
        setLoading(false);
      }
    }

    tick();
    const t = setInterval(tick, pollMs);

    return () => {
      alive = false;
      clearInterval(t);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [orgId, pollMs]);

  return {
    uiStep,     // 🔑 THIS replaces local step state
    status,
    loading,
    error,
  };
}
