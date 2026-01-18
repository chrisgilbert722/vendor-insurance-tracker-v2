// components/OnboardingGuard.js
// ============================================================
// CANONICAL ROUTING GUARD — Single source of truth
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
// PROTECTED ROUTES (everything else):
//   - No session → redirect to /auth/login
//   - No org → create org, redirect to /onboarding/ai-wizard
//   - Onboarding incomplete → redirect to /onboarding/ai-wizard
//   - Onboarding complete → allow
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

// Public paths that never redirect (vendor portals, API, etc.)
const PUBLIC_PATHS = [
  "/vendor-upload",
  "/vendor-pages",
  "/vendor/portal",
  "/broker",
  "/api",
  "/billing",
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
  const { activeOrgId, activeOrg, orgs, loading: orgLoading, setActiveOrg } = useOrg();

  const [checked, setChecked] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const redirectedRef = useRef(false);

  // Reset redirect flag on route change
  useEffect(() => {
    redirectedRef.current = false;
    setChecked(false);
  }, [router.pathname]);

  useEffect(() => {
    // Wait for auth and org to load
    if (userInitializing || orgLoading) return;
    if (creatingOrg) return;

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
          router.replace("/onboarding/ai-wizard");
        }
        return;
      }

      // Has org → check if onboarding complete
      if (activeOrg?.onboarding_completed === true) {
        // Onboarded → redirect to dashboard
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          router.replace("/dashboard");
        }
        return;
      }

      // Not onboarded → redirect to onboarding
      if (!redirectedRef.current) {
        redirectedRef.current = true;
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
          router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      // Has session → allow (page handles org creation if needed)
      setChecked(true);
      return;
    }

    // ========================================
    // PROTECTED ROUTES — Full auth + onboarding check
    // ========================================

    // No session → redirect to login
    if (!user) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // No org → create one automatically, then redirect to onboarding
    if (!orgs || orgs.length === 0) {
      createOrgAndRedirect();
      return;
    }

    // Has org but onboarding not complete → redirect to onboarding
    if (activeOrg?.onboarding_completed !== true) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    // Onboarding complete → allow access
    setChecked(true);

  }, [userInitializing, orgLoading, user, activeOrgId, activeOrg, orgs, router, creatingOrg]);

  // Auto-create org for users who don't have one
  async function createOrgAndRedirect() {
    if (creatingOrg) return;
    setCreatingOrg(true);

    try {
      const token = localStorage.getItem("supabase_token") || "";

      const res = await fetch("/api/orgs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json();

      if (json.ok && json.org) {
        // Activate the new org
        setActiveOrg(json.org);

        // Store org info
        if (json.org.external_uuid) {
          localStorage.setItem("verivo:activeOrgUuid", json.org.external_uuid);
        }
        if (json.org.id) {
          localStorage.setItem("verivo:activeOrgId", String(json.org.id));
        }
      }

      // Redirect to onboarding
      router.replace("/onboarding/ai-wizard");
    } catch (err) {
      console.error("[OnboardingGuard] Failed to create org:", err);
      // Still redirect to onboarding - it will handle the error
      router.replace("/onboarding/ai-wizard");
    } finally {
      setCreatingOrg(false);
    }
  }

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
