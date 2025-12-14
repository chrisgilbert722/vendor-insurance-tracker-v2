// pages/_app.js
import "../public/cockpit.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";
import AdminGuard from "../components/AdminGuard";

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify",
];

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

  const { isLoggedIn, initializing, org } = useUser();

  const [onboardingStep, setOnboardingStep] = useState(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const isAdminRoute = path.startsWith("/admin");

  // 🚫 Never render API routes
  if (typeof window !== "undefined" && router.asPath.startsWith("/api")) {
    return null;
  }

  // Load onboarding state
  useEffect(() => {
    if (!isLoggedIn || !org?.id) {
      setLoadingOnboarding(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/organization/status?orgId=${org.id}`);
        const data = await res.json();
        if (!cancelled && data.ok) {
          setOnboardingStep(data.onboarding_step);
        }
      } catch (err) {
        console.error("[_app] onboarding status error:", err);
      } finally {
        if (!cancelled) setLoadingOnboarding(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, org]);

  // 🔐 AUTH REDIRECT (EFFECT ONLY)
  useEffect(() => {
    if (initializing || redirecting) return;

    if (!isLoggedIn && !PUBLIC_ROUTES.includes(path)) {
      setRedirecting(true);
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(router.asPath)}`
      );
    }
  }, [initializing, isLoggedIn, path, router, redirecting]);

  // 🧭 ONBOARDING REDIRECTS (EFFECT ONLY, ADMIN EXEMPT)
  useEffect(() => {
    if (
      initializing ||
      loadingOnboarding ||
      redirecting ||
      !isLoggedIn ||
      onboardingStep === null ||
      isAdminRoute
    ) {
      return;
    }

    const isOnboardingPage = ONBOARDING_STEPS.some((r) =>
      path.startsWith(r.replace("/complete", ""))
    );

    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      const required = ONBOARDING_STEPS[onboardingStep];
      if (!path.startsWith(required)) {
        setRedirecting(true);
        router.replace(required);
      }
    } else if (isOnboardingPage) {
      setRedirecting(true);
      router.replace("/dashboard");
    }
  }, [
    initializing,
    loadingOnboarding,
    redirecting,
    isLoggedIn,
    onboardingStep,
    isAdminRoute,
    path,
    router,
  ]);

  // ⏳ Global loading
  if (initializing || loadingOnboarding || redirecting) {
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

  const content = (
    <OrgProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </OrgProvider>
  );

  // 🔐 Admin routes guarded here ONLY
  if (isAdminRoute) {
    return <AdminGuard>{content}</AdminGuard>;
  }

  return content;
}

export default function App(props) {
  return (
    <UserProvider>
      <AppShell {...props} />
    </UserProvider>
  );
}
