// lib/useTrialStatus.js
// ============================================================
// TRIAL STATUS HOOK — Client-side trial state management
// Single source of truth for trial status across app
// NOTE: Does NOT auto-redirect. Dashboard BillingGate handles UI.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useOrg } from "../context/OrgContext";

export function useTrialStatus() {
  const { activeOrgId } = useOrg();

  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrialStatus = useCallback(async () => {
    if (!activeOrgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/billing/trial-status?orgId=${activeOrgId}`);
      const data = await res.json();

      if (data.ok && data.trial) {
        setTrial(data.trial);
      } else {
        setError(data.error || "Failed to fetch trial status");
      }
    } catch (err) {
      console.error("[useTrialStatus] error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  // Fetch trial status when org changes
  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  return {
    trial,
    loading,
    error,
    refetch: fetchTrialStatus,
    isActive: trial?.active ?? false,
    isExpired: trial?.expired ?? false,
    isPaid: trial?.is_paid ?? false,
    daysLeft: trial?.days_left ?? 0,
  };
}

export default useTrialStatus;
