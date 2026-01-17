// lib/useFirstTimeCheck.js
// ============================================================
// FIRST-TIME STATE HOOK — Single source of truth (client-side)
// Used for onboarding enforcement, trial start, empty states
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "../context/OrgContext";

export function useFirstTimeCheck() {
  const { activeOrgId } = useOrg();

  const [state, setState] = useState({
    loading: true,
    isFirstTime: null,
    checks: null,
    counts: null,
    onboardingStep: null,
    trialStartedAt: null,
    error: null,
  });

  const fetchFirstTimeState = useCallback(async () => {
    if (!activeOrgId) {
      setState((prev) => ({ ...prev, loading: false, isFirstTime: true }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true }));
      const res = await fetch(`/api/org/first-time-check?orgId=${activeOrgId}`);
      const data = await res.json();

      if (data.ok) {
        setState({
          loading: false,
          isFirstTime: data.isFirstTime,
          checks: data.checks,
          counts: data.counts,
          onboardingStep: data.onboardingStep,
          trialStartedAt: data.trialStartedAt,
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: data.error,
          isFirstTime: true, // Fail open
        }));
      }
    } catch (err) {
      console.error("[useFirstTimeCheck] error:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
        isFirstTime: true, // Fail open
      }));
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchFirstTimeState();
  }, [fetchFirstTimeState]);

  return {
    ...state,
    refetch: fetchFirstTimeState,
  };
}

export default useFirstTimeCheck;
