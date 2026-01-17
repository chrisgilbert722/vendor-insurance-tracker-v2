// lib/useTrialStatus.js
// ============================================================
// TRIAL STATUS HOOK — Client-side trial state management
// Single source of truth for trial status across app
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../context/OrgContext";

// Pages that don't require trial check
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/billing",
  "/billing/start",
  "/billing/upgrade",
  "/billing/success",
  "/billing/activate",
  "/pricing",
  "/terms",
  "/privacy",
  "/vendor/upload", // Vendor upload link (public)
];

export function useTrialStatus() {
  const router = useRouter();
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

  // Check if current path requires trial
  const isProtectedPath = useCallback((path) => {
    // Check if path starts with any public path
    return !PUBLIC_PATHS.some(
      (p) => path === p || path.startsWith(p + "/") || path.startsWith("/vendor/upload")
    );
  }, []);

  // Redirect to billing if trial expired
  useEffect(() => {
    if (loading) return;
    if (!trial) return;

    const path = router.pathname;

    // Skip check for public paths
    if (!isProtectedPath(path)) return;

    // If trial expired and not paid, redirect to billing
    if (trial.expired && !trial.is_paid) {
      router.replace("/billing/upgrade");
    }
  }, [trial, loading, router, isProtectedPath]);

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
