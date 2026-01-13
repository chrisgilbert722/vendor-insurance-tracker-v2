import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Telemetry-only onboarding observer (FAIL-OPEN)
 * - Polls /api/onboarding/status
 * - Backend handles auth
 * - NO supabase on client
 * - NEVER blocks UI
 */
export function useOnboardingObserver({ orgId, pollMs = 1200 }) {
  const router = useRouter();

  const [uiStep, setUiStep] = useState(4); // fail-open default
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const lastStepRef = useRef(4);
  const abortRef = useRef(null);
  const hasResolvedOnceRef = useRef(false);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    // Billing must never block
    if (router.pathname.startsWith("/billing")) {
      setUiStep(4);
      setLoading(false);
      return;
    }

    let alive = true;

    async function tick() {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setError("");

        const res = await fetch(
          `/api/onboarding/status?orgId=${encodeURIComponent(orgId)}`,
          {
            signal: abortRef.current.signal,
            credentials: "include", // allow cookie-based auth
            headers: {
              "cache-control": "no-cache",
            },
          }
        );

        const json = await res.json();
        if (!alive) return;

        // 🚨 FAIL-OPEN: API error
        if (!json || json.ok === false) {
          setUiStep(4);
          lastStepRef.current = 4;
          setStatus(json || null);
          setLoading(false);
          return;
        }

        setStatus(json);

        const backendStepRaw = Number(json.onboardingStep);

        if (!Number.isFinite(backendStepRaw)) {
          setUiStep(4);
          lastStepRef.current = 4;
          setLoading(false);
          return;
        }

        const nextUiStep = clamp(backendStepRaw + 1, 1, 10);

        if (nextUiStep > lastStepRef.current) {
          lastStepRef.current = nextUiStep;
          setUiStep(nextUiStep);
        } else if (!hasResolvedOnceRef.current) {
          lastStepRef.current = nextUiStep;
          setUiStep(nextUiStep);
        }

        hasResolvedOnceRef.current = true;
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        if (e?.name === "AbortError") return;

        // HARD FAIL-OPEN
        setError("Onboarding sync failed (fail-open).");
        setUiStep(4);
        lastStepRef.current = 4;
        hasResolvedOnceRef.current = true;
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
  }, [orgId, pollMs, router.pathname]);

  return {
    uiStep,
    status,
    loading,
    error,
  };
}
