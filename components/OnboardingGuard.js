// components/OnboardingGuard.js
// ============================================================
// CANONICAL ROUTING GUARD — Single source of truth
//
// HARD INVARIANTS (per mandate):
// ❌ NO billing redirects from this guard
// ❌ NO auto-redirects without user action
// ✅ Pages render and show their own gates/UI
// ✅ Only redirects: auth (login) and onboarding (wizard)
//
// ROUTING RULES:
//
// MARKETING PAGES (/, /property-management, /pricing, /terms, /privacy, /compare):
//   - Logged OUT → render page
//   - Logged IN + onboarded → redirect to /dashboard
//   - Logged IN + NOT onboarded → redirect to /onboarding/ai-wizard
//
// AUTH PAGES (/login, /signup, /auth/*):
//   - Always accessible
//
// ONBOARDING PAGES (/onboarding/*):
//   - No session → redirect to /auth/login
//   - Has session → allow (page handles org creation)
//
// BILLING PAGES (/billing/*):
//   - Always accessible (handles own auth)
//
// PROTECTED ROUTES (everything else):
//   - No session → redirect to /auth/login
//   - No org → redirect to /onboarding/ai-wizard
//   - Onboarding incomplete → redirect to /onboarding/ai-wizard
//   - Onboarding complete → ALLOW (page renders billing gate if needed)
//
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useOrg } from "../context/OrgContext";

// Marketing pages that redirect logged-in users
const MARKETING_PATHS = [
  "/",
  "/property-management",
  "/pricing",
  "/terms",
  "/privacy",
  "/compare",
];

// Auth pages - always accessible, no redirects
const AUTH_PATHS = [
  "/login",
  "/signup",
  "/auth",
];

// Public paths that never redirect (vendor portals, API, billing, etc.)
const PUBLIC_PATHS = [
  "/vendor-upload",
  "/vendor-pages",
  "/vendor/portal",
  "/broker",
  "/api",
  "/billing", // Billing pages handle their own auth
];

function isMarketingPath(pathname) {
  return MARKETING_PATHS.some((p) => pathname === p);
}

function isAuthPath(pathname) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isOnboardingPath(pathname) {
  return pathname.startsWith("/onboarding");
}

function isPublicPath(pathname) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function OnboardingGuard({ children }) {
  const router = useRouter();
  const { user, initializing: userInitializing } = useUser();
  const { activeOrgId, activeOrg, orgs, loading: orgLoading } = useOrg();

  const [checked, setChecked] = useState(false);
  const redirectedRef = useRef(false);

  // Reset redirect flag on route change
  useEffect(() => {
    redirectedRef.current = false;
    setChecked(false);
  }, [router.pathname]);

  useEffect(() => {
    // Wait for auth and org to load
    if (userInitializing || orgLoading) return;

    const pathname = router.pathname;

    // ========================================
    // AUTH PAGES — Always accessible
    // ========================================
    if (isAuthPath(pathname)) {
      setChecked(true);
      return;
    }

    // ========================================
    // PUBLIC PATHS — Always accessible
    // ========================================
    if (isPublicPath(pathname)) {
      setChecked(true);
      return;
    }

    // ========================================
    // MARKETING PAGES — Redirect if logged in
    // ========================================
    if (isMarketingPath(pathname)) {
      if (!user) {
        // Not logged in → show marketing page
        setChecked(true);
        return;
      }

      // Logged in → check onboarding status
      if (!orgs || orgs.length === 0) {
        // No org yet → redirect to onboarding
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          console.log("[OnboardingGuard] REDIRECT: no org → /onboarding/ai-wizard");
          router.replace("/onboarding/ai-wizard");
        }
        return;
      }

      // Has org → check if onboarding complete
      if (activeOrg?.onboarding_completed === true) {
        // Onboarded → redirect to dashboard
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          console.log("[OnboardingGuard] REDIRECT: onboarded → /dashboard");
          router.replace("/dashboard");
        }
        return;
      }

      // Not onboarded → redirect to onboarding
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        console.log("[OnboardingGuard] REDIRECT: not onboarded → /onboarding/ai-wizard");
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    // ========================================
    // ONBOARDING PAGES — Require session
    // ========================================
    if (isOnboardingPath(pathname)) {
      if (!user) {
        // No session → redirect to login
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          console.log("[OnboardingGuard] REDIRECT: no session → /auth/login");
          router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      // Has session → allow (page handles org creation if needed)
      setChecked(true);
      return;
    }

    // ========================================
    // PROTECTED ROUTES — Auth + onboarding check only
    // NO BILLING REDIRECTS - pages show their own gates
    // ========================================

    // No session → redirect to login
    if (!user) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        console.log("[OnboardingGuard] REDIRECT: no session → /auth/login");
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // No org → redirect to onboarding
    if (!orgs || orgs.length === 0) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        console.log("[OnboardingGuard] REDIRECT: no org → /onboarding/ai-wizard");
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    // Has org but onboarding not complete → redirect to onboarding
    if (activeOrg?.onboarding_completed !== true) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        console.log("[OnboardingGuard] REDIRECT: onboarding incomplete → /onboarding/ai-wizard");
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    // ========================================
    // ONBOARDING COMPLETE → ALLOW
    // Page will render its own billing gate if needed
    // NO BILLING REDIRECTS FROM THIS GUARD
    // ========================================
    setChecked(true);

  }, [userInitializing, orgLoading, user, activeOrgId, activeOrg, orgs, router.pathname, router]);

  // Show nothing while checking (prevents flash)
  if (!checked && !isAuthPath(router.pathname) && !isPublicPath(router.pathname)) {
    // For marketing pages, show content while logged out
    if (isMarketingPath(router.pathname) && !user && !userInitializing) {
      return children;
    }
    return null;
  }

  return children;
}
