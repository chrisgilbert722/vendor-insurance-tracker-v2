import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Telemetry-only onboarding observer (FAIL-OPEN)
 * - Polls /api/onboarding/status
 * - Mirrors organizations.onboarding_step (INT, 0-based)
 * - NEVER blocks UI rendering
 * - GUARANTEES a usable uiStep
 */
export function useOnboardingObserver({ orgId, pollMs = 1200 }) {
  const router = useRouter();

  const [uiStep, setUiStep] = useState(1);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const lastStepRef = useRef(1);
  const abortRef = useRef(null);
  const hasResolvedOnceRef = useRef(false);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    // 🚫 HARD BYPASS — billing must never be blocked
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

        // 🔑 Get Supabase session (hydration-safe)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Fail-open if session not ready yet
        if (!session?.access_token) {
          if (!hasResolvedOnceRef.current) {
            setUiStep(4);
            hasResolvedOnceRef.current = true;
          }
          setLoading(false);
          return;
        }

        const res = await fetch(
          `/api/onboarding/status?orgId=${encodeURIComponent(orgId)}`,
          {
            signal: abortRef.current.signal,
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "cache-control": "no-cache",
            },
          }
        );

        const json = await res.json();
        if (!alive) return;

        // 🚨 FAIL-OPEN: API returned nothing useful
        if (!json || json.ok === false) {
          if (!hasResolvedOnceRef.current) {
            setUiStep(4);
            lastStepRef.current = 4;
            hasResolvedOnceRef.current = true;
          }
          setStatus(json || null);
          setLoading(false);
          return;
        }

        setStatus(json);

        // Backend onboarding_step is 0-based
        const backendStepRaw = Number(json.onboardingStep);

        // 🚨 Missing / invalid step → fail open to Step 4
        if (!Number.isFinite(backendStepRaw)) {
          if (!hasResolvedOnceRef.current) {
            setUiStep(4);
            lastStepRef.current = 4;
            hasResolvedOnceRef.current = true;
          }
          setLoading(false);
          return;
        }

        // UI is 1-based
        const nextUiStep = clamp(backendStepRaw + 1, 1, 10);

        // Forward-only progression
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

        // 🚨 HARD FAIL-OPEN ON ERROR
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
