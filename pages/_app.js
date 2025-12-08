// pages/_app.js
import "../public/cockpit.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";

// Routes that never require auth
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify",
];

// All onboarding routes
const ONBOARDING_STEPS = [
  "/onboarding/start",
  "/onboarding/company",
  "/onboarding/insurance",
  "/onboarding/rules",
  "/onboarding/team",
  "/onboarding/vendors",
  "/onboarding/complete",
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname;

  const { isLoggedIn, initializing, user, org } = useUser();

  const [onboardingStep, setOnboardingStep] = useState(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  /* ============================================================
     ABSOLUTE HARD STOP:
     NEVER render ANYTHING for /api/* — return null IMMEDIATELY
  ============================================================ */
  if (typeof window !== "undefined" && router.asPath.startsWith("/api")) {
    return null;
  }

  /* ============================================================
     LOAD ORG ONBOARDING INFO
  ============================================================ */
  useEffect(() => {
    if (!isLoggedIn || !org?.id) {
      setLoadingOnboarding(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/organization/status?orgId=${org.id}`);
        const data = await res.json();
        if (data.ok) {
          setOnboardingStep(data.onboarding_step);
        }
      } catch (err) {
        console.error("Failed loading onboarding status", err);
      }

      setLoadingOnboarding(false);
    }

    load();
  }, [isLoggedIn, org]);

  const isOnboardingPage = ONBOARDING_STEPS.some((r) =>
    path.startsWith(r.replace("/complete", ""))
  );

  /* ============================================================
     GLOBAL LOADING (APP ROUTES ONLY)
  ============================================================ */
  if (initializing || loadingOnboarding) {
    return (
      <div
        style={{
          minHeight: "100vh",
          color: "#e5e7eb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        }}
      >
        <div style={{ fontSize: 22 }}>Loading…</div>
      </div>
    );
  }

  /* ============================================================
     LOGIN REDIRECT FOR APP ROUTES ONLY
  ============================================================ */
  if (!isLoggedIn && !PUBLIC_ROUTES.includes(path)) {
    router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  /* ============================================================
     ONBOARDING REDIRECTS
  ============================================================ */
  if (isLoggedIn && onboardingStep !== null) {
    if (onboardingStep < 6) {
      const required = ONBOARDING_STEPS[onboardingStep];
      if (!path.startsWith(required)) {
        router.replace(required);
        return null;
      }
    }

    if (onboardingStep >= 6 && isOnboardingPage) {
      router.replace("/dashboard");
      return null;
    }
  }

  /* ============================================================
     NORMAL APP RENDER
  ============================================================ */
  return (
    <OrgProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </OrgProvider>
  );
}

export default function App(props) {
  return (
    <UserProvider>
      <AppShell {...props} />
    </UserProvider>
  );
}
