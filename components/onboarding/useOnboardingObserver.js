import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Telemetry-only onboarding observer
 * - Polls /api/onboarding/status
 * - Mirrors organizations.onboarding_step (INT)
 * - NEVER mutates backend
 * - Forward-only UI progression
 *
 * IMPORTANT:
 * - Billing routes MUST bypass onboarding enforcement
 */
export function useOnboardingObserver({ orgId, pollMs = 1200 }) {
  const router = useRouter();

  const [uiStep, setUiStep] = useState(1);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const lastStepRef = useRef(1);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!orgId) return;

    // 🚫 HARD BYPASS: Billing routes are allowed to escape onboarding
    if (router.pathname.startsWith("/billing")) {
      return;
    }

    let alive = true;

    async function tick() {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        setLoading(true);
        setError("");

        // 🔑 GET SUPABASE SESSION (HYDRATION-SAFE)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Fail-open: don’t brick UI if session not ready yet
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const res = await fetch(
          `/api/onboarding/status?orgId=${encodeURIComponent(orgId)}`,
          {
            signal: abortRef.current.signal,
            headers: {
              "cache-control": "no-cache",
              Authorization: `Bearer ${session.access_token}`,
            },
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
  }, [orgId, pollMs, router.pathname]);

  return {
    uiStep,
    status,
    loading,
    error,
  };
}
