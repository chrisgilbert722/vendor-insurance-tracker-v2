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
  "/onboarding",           // 🔥 added onboarding wizard as public
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { isLoggedIn, initializing, user } = useUser();

  const path = router.pathname;
  const isPublic = PUBLIC_ROUTES.includes(path);
  const isOnboarding = path.startsWith("/onboarding"); // 🔥 detect wizard pages

  useEffect(() => {
    if (initializing) return;

    // 🟦 Onboarding wizard should NOT require login
    if (isOnboarding) return;

    // 🟦 Public routes allowed
    if (isPublic) return;

    // 🔥 Protected routes → must be logged in
    if (!isLoggedIn) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    // 🔥 Billing rules go here later
    // const meta = user?.user_metadata || {};
    // if (!meta.subscription_active) {
    //   router.replace("/billing/upgrade");
    //   return;
    // }

  }, [initializing, isLoggedIn, isPublic, isOnboarding, user, router]);

  // Still initializing → show loading
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

  // If not logged in & not public & not onboarding → block
  if (!isLoggedIn && !isPublic && !isOnboarding) {
    return null;
  }

  return (
    <OrgProvider>
      {/* 🔥 BYPASS LAYOUT FOR ONBOARDING WIZARD */}
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
