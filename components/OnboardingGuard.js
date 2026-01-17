// components/OnboardingGuard.js
// ============================================================
// ONBOARDING GUARD — Enforces onboarding for first-time users
// Uses first-time state check to redirect to onboarding
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useOrg } from "../context/OrgContext";

// Pages that don't require onboarding (auth, onboarding, public)
const ALLOWED_PATHS = [
  "/",
  "/login",
  "/signup",
  "/auth",
  "/onboarding",
  "/vendor-upload",
  "/api",
];

function isAllowedPath(pathname) {
  return ALLOWED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function OnboardingGuard({ children }) {
  const router = useRouter();
  const { user, initializing: userInitializing } = useUser();
  const { activeOrgId, loading: orgLoading } = useOrg();

  const [checked, setChecked] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Wait for auth and org to load
    if (userInitializing || orgLoading) return;

    // No user = no enforcement needed
    if (!user) {
      setChecked(true);
      return;
    }

    // Allowed paths don't need enforcement
    if (isAllowedPath(router.pathname)) {
      setChecked(true);
      return;
    }

    // No org = redirect to onboarding
    if (!activeOrgId) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    // Check first-time state
    async function checkFirstTime() {
      try {
        const res = await fetch(`/api/org/first-time-check?orgId=${activeOrgId}`);
        const data = await res.json();

        if (data.ok && data.checks?.onboardingNotComplete) {
          // User has not completed onboarding - redirect
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            // Redirect to appropriate onboarding step
            const step = data.onboardingStep ?? 0;
            const stepPaths = [
              "/onboarding/ai-wizard",
              "/onboarding/company",
              "/onboarding/insurance",
              "/onboarding/vendors",
              "/onboarding/rules",
              "/onboarding/team",
              "/onboarding/complete",
            ];
            const targetPath = stepPaths[Math.min(step, stepPaths.length - 1)];
            router.replace(targetPath);
            return;
          }
        }

        // User has completed onboarding or check passed
        setChecked(true);
      } catch (err) {
        console.warn("[OnboardingGuard] Check failed, allowing access:", err);
        setChecked(true); // Fail open
      }
    }

    checkFirstTime();
  }, [userInitializing, orgLoading, user, activeOrgId, router]);

  // Show nothing while checking (prevents flash of content)
  if (!checked && user && !isAllowedPath(router.pathname)) {
    return null;
  }

  return children;
}
