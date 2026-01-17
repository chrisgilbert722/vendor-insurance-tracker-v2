// components/OnboardingGuard.js
// ============================================================
// ONBOARDING GUARD — Enforces onboarding for protected routes
//
// ROUTING RULES:
// - Sales pages: ALWAYS accessible (even when logged in)
// - Auth pages: ALWAYS accessible
// - Onboarding pages: ALWAYS accessible
// - Protected routes (dashboard, vendors, admin):
//   - No user: allow (page handles auth)
//   - User with no org: redirect to onboarding start
//   - User with org, onboarding incomplete: redirect to current step
//   - User with org, onboarding complete: allow
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useOrg } from "../context/OrgContext";

// PUBLIC PAGES — Never enforce onboarding, always accessible
const PUBLIC_PATHS = [
  "/",                      // Landing page
  "/property-management",   // Sales page
  "/pricing",               // Pricing page
  "/terms",                 // Legal
  "/privacy",               // Legal
  "/compare",               // Competitor comparison
  "/login",                 // Auth
  "/signup",                // Auth
  "/auth",                  // Auth callbacks
  "/onboarding",            // Onboarding flow
  "/vendor-upload",         // Public vendor upload
  "/vendor-pages",          // Public vendor portal
  "/vendor/portal",         // Public vendor portal
  "/broker",                // Broker portal
  "/api",                   // API routes
  "/billing",               // Billing pages
];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function OnboardingGuard({ children }) {
  const router = useRouter();
  const { user, initializing: userInitializing } = useUser();
  const { activeOrgId, activeOrg, orgs, loading: orgLoading } = useOrg();

  const [checked, setChecked] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Reset redirect flag on route change
    redirectedRef.current = false;
  }, [router.pathname]);

  useEffect(() => {
    // Wait for auth and org to load
    if (userInitializing || orgLoading) return;

    const pathname = router.pathname;

    // PUBLIC PATHS: Always allow, no enforcement
    if (isPublicPath(pathname)) {
      setChecked(true);
      return;
    }

    // No user = allow (page will handle auth redirect if needed)
    if (!user) {
      setChecked(true);
      return;
    }

    // ========================================
    // PROTECTED ROUTE LOGIC
    // ========================================

    // User logged in but has NO org → redirect to onboarding start
    if (!orgs || orgs.length === 0 || !activeOrgId) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace("/onboarding/start");
      }
      return;
    }

    // User has org → check onboarding status
    async function checkOnboardingStatus() {
      try {
        // First check if org has completed onboarding
        if (activeOrg?.onboarding_completed === true) {
          setChecked(true);
          return;
        }

        // Fetch detailed status
        const res = await fetch(`/api/org/first-time-check?orgId=${activeOrgId}`);
        const data = await res.json();

        // Onboarding complete → allow access
        if (data.ok && !data.checks?.onboardingNotComplete) {
          setChecked(true);
          return;
        }

        // Onboarding incomplete → redirect to appropriate step
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          const step = data.onboardingStep ?? 0;
          const stepPaths = [
            "/onboarding/start",
            "/onboarding/company",
            "/onboarding/vendors-upload",
            "/onboarding/insurance",
            "/onboarding/rules",
            "/onboarding/team",
            "/onboarding/complete",
          ];
          const targetPath = stepPaths[Math.min(step, stepPaths.length - 1)];
          router.replace(targetPath);
        }
      } catch (err) {
        console.warn("[OnboardingGuard] Check failed, allowing access:", err);
        setChecked(true); // Fail open
      }
    }

    checkOnboardingStatus();
  }, [userInitializing, orgLoading, user, activeOrgId, activeOrg, orgs, router]);

  // Show nothing while checking protected routes (prevents flash)
  if (!checked && user && !isPublicPath(router.pathname)) {
    return null;
  }

  return children;
}
