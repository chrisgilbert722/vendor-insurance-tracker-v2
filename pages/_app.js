// pages/_app.js
import "../public/cockpit.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";
import { sql } from "../lib/db"; // Adjust if your db helper is elsewhere

// Public routes that DO NOT require login
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify"
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { isLoggedIn, initializing, user, org } = useUser();
  const [loadingOrg, setLoadingOrg] = useState(true);
  const path = router.pathname;

  // Fetch onboarding_step
  const [onboardingStep, setOnboardingStep] = useState(null);

  useEffect(() => {
    if (!isLoggedIn || !org?.id) return;

    async function loadOrg() {
      try {
        const res = await fetch(`/api/organization/status?orgId=${org.id}`);
        const json = await res.json();
        if (json.ok) {
          setOnboardingStep(json.onboarding_step);
        }
      } catch (err) {
        console.error("[_app] Failed to load org status", err);
      } finally {
        setLoadingOrg(false);
      }
    }

    loadOrg();
  }, [isLoggedIn, org]);

  // Loading state early
  if (initializing || loadingOrg) {
    return (
      <div
        style={{
          minHeight: "100vh",
          color: "#e5e7eb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)"
        }}
      >
        <div style={{ fontSize: 22 }}>Loading…</div>
      </div>
    );
  }

  // If logged OUT
  if (!isLoggedIn && !PUBLIC_ROUTES.includes(path)) {
    router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  // ⭐ ONBOARDING REDIRECT FLOW
  const onboardingRoutes = [
    "/onboarding/start",
    "/onboarding/company",
    "/onboarding/insurance",
    "/onboarding/rules",
    "/onboarding/team",
    "/onboarding/vendors",
    "/onboarding/complete"
  ];

  const isOnboardingPage = onboardingRoutes.some((r) =>
    path.startsWith(r.replace("/complete", "")) // loose match
  );

  // If onboarding NOT COMPLETE
  if (isLoggedIn && onboardingStep < 6) {
    if (!isOnboardingPage) {
      const steps = [
        "/onboarding/start",
        "/onboarding/company",
        "/onboarding/insurance",
        "/onboarding/rules",
        "/onboarding/team",
        "/onboarding/vendors",
        "/onboarding/complete"
      ];
      router.replace(steps[onboardingStep]);
      return null;
    }
  }

  // If onboarding COMPLETE, but user goes to onboarding manually → block
  if (onboardingStep >= 6 && isOnboardingPage) {
    router.replace("/dashboard");
    return null;
  }

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
