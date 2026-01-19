// components/OnboardingGuard.js
// ============================================================
// CANONICAL ROUTING GUARD — Single source of truth
//
// ROUTING RULES:
//
// MARKETING PAGES (/, /property-management, /pricing, /terms, /privacy, /compare):
//   - Logged OUT → render page
//   - Logged IN + onboarded + subscribed → redirect to /dashboard
//   - Logged IN + onboarded + NOT subscribed → redirect to /billing/checkout
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
//   - No org → create org, redirect to /onboarding/ai-wizard
//   - Onboarding incomplete → redirect to /onboarding/ai-wizard
//   - No active subscription → redirect to /billing/checkout
//   - All checks pass → allow
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useOrg } from "../context/OrgContext";
import { supabase } from "../lib/supabaseClient";

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
  const { activeOrgId, activeOrg, orgs, loading: orgLoading, setActiveOrg } = useOrg();

  const [checked, setChecked] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [accessStatus, setAccessStatus] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const redirectedRef = useRef(false);

  // Reset redirect flag on route change
  useEffect(() => {
    redirectedRef.current = false;
    setChecked(false);
    setAccessStatus(null);
  }, [router.pathname]);

  // Check access status via API (subscription check)
  async function checkAccessStatus() {
    if (checkingAccess) return null;
    setCheckingAccess(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return null;

      const res = await fetch("/api/auth/access-check", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      setAccessStatus(json);
      return json;
    } catch (err) {
      console.error("[OnboardingGuard] Access check failed:", err);
      return null;
    } finally {
      setCheckingAccess(false);
    }
  }

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
    // PROTECTED ROUTES — Full auth + onboarding + subscription check
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

    // Onboarding complete → check subscription status via API
    if (!accessStatus && !checkingAccess) {
      checkAccessStatus().then((result) => {
        if (!result) return;

        // Handle access check result
        if (result.status === "BLOCK_PAYWALL" && result.redirect) {
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            router.replace(result.redirect);
          }
        } else if (result.status === "ALLOW") {
          setChecked(true);
        }
      });
      return;
    }

    // If access check complete and allowed, show content
    if (accessStatus?.status === "ALLOW") {
      setChecked(true);
      return;
    }

    // If access check complete and blocked, redirect already happened
    if (accessStatus?.status === "BLOCK_PAYWALL") {
      return;
    }

    // Default: still checking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInitializing, orgLoading, user, activeOrgId, activeOrg, orgs, router.pathname, creatingOrg, accessStatus, checkingAccess]);

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
