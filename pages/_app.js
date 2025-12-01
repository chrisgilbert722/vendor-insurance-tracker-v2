// pages/_app.js — Unified Auth Shell V7 (Onboarding Normalized)
import "../public/cockpit.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";

// Routes that NEVER require authentication
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify",
  "/billing/start",
  "/billing/success",
  "/billing/upgrade",
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { isLoggedIn, initializing } = useUser();

  const path = router.pathname;

  // Determine if the route is public
  const isPublic = PUBLIC_ROUTES.includes(path);

  useEffect(() => {
    if (initializing) return;

    // Public routes always allowed
    if (isPublic) return;

    // Protected routes require login
    if (!isLoggedIn) {
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(router.asPath)}`
      );
      return;
    }
  }, [initializing, isLoggedIn, isPublic, router]);

  // Loading screen during auth bootstrap
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

  // If not logged in & route is protected → delay render
  if (!isLoggedIn && !isPublic) {
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
