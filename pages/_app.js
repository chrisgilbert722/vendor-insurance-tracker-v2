// pages/_app.js
import "../public/cockpit.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import { UserProvider, useUser } from "../context/UserContext";
import Layout from "../components/Layout";

// Routes that ANYONE can access
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify"
];

// Onboarding steps in order
const ONBOARDING_STEPS = [
  "/onboarding/start",
  "/onboarding/company",
  "/onboarding/insurance",
  "/onboarding/rules",
  "/onboarding/team",
  "/onboarding/vendors",
  "/onboarding/complete"
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { isLoggedIn, initializing, user, org } = useUser();

  // 1️⃣ Still initializing user? Show nothing until ready
  if (initializing) return null;

  const path = router.pathname;
  const isPublic = PUBLIC_ROUTES.includes(path);

  // 2️⃣ If logged OUT → redirect to login (but don’t block public routes)
  useEffect(() => {
    if (!isLoggedIn && !isPublic) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [isLoggedIn, isPublic, router]);

  // 3️⃣ If logged IN but org not loaded yet → allow app to load normally
  if (isLoggedIn && !org) {
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
        }}>
        <div style={{ fontSize: 22 }}>Loading organization…</div>
      </div>
    );
  }

  // 4️⃣ ONBOARDING REDIRECT (but never block rendering)
  useEffect(() => {
    async function run() {
      if (!isLoggedIn || !org?.id) return;

      try {
        const res = await fetch(`/api/organization/status?orgId=${org.id}`);
        const json = await res.json();

        if (!json.ok) return;

        const step = json.onboarding_step;

        const isOnboardingPage = path.startsWith("/onboarding");

        // NOT FINISHED ONBOARDING
        if (step < 6 && !isOnboardingPage) {
          router.replace(ONBOARDING_STEPS[step]);
        }

        // FINISHED ONBOARDING but tries to access onboarding pages
        if (step >= 6 && isOnboardingPage) {
          router.replace("/dashboard");
        }
      } catch (err) {
        console.error("[_app] onboarding check failed:", err);
      }
    }

    run();
  }, [isLoggedIn, org, path, router]);

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
