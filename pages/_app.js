// pages/_app.js
import "../public/cockpit.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";

// Routes that never require authentication
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify",
  "/billing/start",
  "/billing/success",
  "/billing/upgrade",
  "/onboarding",          // 🔥 FULLSCREEN WIZARD ALLOWED
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { isLoggedIn, initializing, user } = useUser();

  const path = router.pathname;

  // 🔥 Detect wizard route: ANYTHING under /onboarding
  const isOnboarding = path.startsWith("/onboarding");

  // 🔥 Public routes (login, callbacks, and onboarding)
  const isPublic = PUBLIC_ROUTES.includes(path) || isOnboarding;

  useEffect(() => {
    if (initializing) return;

    // 🔥 Wizard is PUBLIC — NEVER redirect
    if (isOnboarding) return;

    // 🟦 Public routes are always allowed
    if (isPublic) return;

    // 🔒 Protected routes require login
    if (!isLoggedIn) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    // Billing checks added later
  }, [initializing, isLoggedIn, isOnboarding, isPublic, user, router]);

  // ⏳ Still initializing? Show loading screen
  if (initializing) {
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

  // 🔒 If not logged in & not public → block render
  if (!isLoggedIn && !isPublic) {
    return null;
  }

  return (
    <OrgProvider>
      {/* 🔥 BYPASS LAYOUT COMPLETELY FOR THE ONBOARDING WIZARD */}
      {isOnboarding ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
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
