// pages/_app.js
import "../public/cockpit.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import { UserProvider, useUser } from "../context/UserContext";
import Layout from "../components/Layout";

// Routes allowed without auth
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify"
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
  const { isLoggedIn, initializing, user, org } = useUser();

  // Safe flags
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const path = router.pathname;
  const isPublic = PUBLIC_ROUTES.includes(path);
  const isOnboardingPage = path.startsWith("/onboarding");

  // 1️⃣ While loading user, render nothing (no crash)
  if (initializing) return null;

  // 2️⃣ If not logged in and not already on a public route → go to login
  useEffect(() => {
    if (!isLoggedIn && !isPublic) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [isLoggedIn, isPublic, router, path]);

  // 3️⃣ If user logged in but org not ready yet → render a gentle loading
  if (isLoggedIn && !org) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e5e7eb",
      }}>
        Loading organization…
      </div>
    );
  }

  // 4️⃣ Load onboarding step ONLY after org is ready
  useEffect(() => {
    async function loadStep() {
      if (!isLoggedIn || !org?.id) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const res = await fetch(`/api/organization/status?orgId=${org.id}`);
        const json = await res.json();
        if (json.ok) {
          setOnboardingStep(json.onboarding_step);
        } else {
          console.error("Onboarding API error:", json.error);
        }
      } catch (err) {
        console.error("Onboarding fetch error:", err);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    loadStep();
  }, [isLoggedIn, org]);

  // 5️⃣ While checking onboarding, do not redirect yet
  if (isLoggedIn && checkingOnboarding) return null;

  // 6️⃣ Enforce onboarding AFTER everything is loaded
  useEffect(() => {
    if (!isLoggedIn || onboardingStep == null) return;

    const step = Number(onboardingStep);

    if (step < 6 && !isOnboardingPage) {
      router.replace(ONBOARDING_STEPS[step]);
    }

    if (step >= 6 && isOnboardingPage) {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, onboardingStep, isOnboardingPage, router, path]);

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
