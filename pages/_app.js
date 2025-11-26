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
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { isLoggedIn, initializing, user } = useUser();

  const path = router.pathname;
  const isPublic = PUBLIC_ROUTES.includes(path);

  useEffect(() => {
    // 🚫 DO NOTHING until Supabase initializes
    if (initializing) return;

    // 🟦 Public routes are always allowed
    if (isPublic) return;

    // 🔥 If no session yet → go to login
    if (!isLoggedIn) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    // 🔥 Billing logic (later)
    // const meta = user?.user_metadata || {};
    // if (!meta.subscription_active) {
    //   router.replace("/billing/upgrade");
    //   return;
    // }

  }, [initializing, isLoggedIn, isPublic, user, router]);

  // 🚫 While initializing, show NOTHING (prevents loops)
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

  // 🚫 If not logged in & not public route → avoid flashing protected content
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
