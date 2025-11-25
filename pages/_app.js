// pages/_app.js
import "../public/cockpit.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";

// Public routes that require NO authentication
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",     // ← CRITICAL FOR MAGIC LINK
  "/auth/verify",
  "/auth/signup",
  "/billing/start",
  "/billing/success",
  "/billing/upgrade",
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { user, isLoggedIn, initializing } = useUser();

  useEffect(() => {
    if (initializing) return; // Wait for Supabase to hydrate session

    const path = router.pathname;
    const isPublic = PUBLIC_ROUTES.includes(path);

    // ===========================================================
    // 🔐 (1) Not logged in? → Redirect to login
    // ===========================================================
    if (!isPublic && !isLoggedIn) {
      const redirectTo = encodeURIComponent(router.asPath || "/dashboard");
      router.replace(`/auth/login?redirect=${redirectTo}`);
      return;
    }

    // ===========================================================
    // 💳 (2) Logged in but NOT paid? → Redirect to paywall
    // ===========================================================
    if (isLoggedIn && !isPublic) {
      const meta = user?.user_metadata || {};

      const subscription = meta.subscription_status || "none";
      const trialActive = meta.trial_active === true;

      const trialEndsAt = meta.trial_ends_at
        ? new Date(meta.trial_ends_at)
        : null;

      const now = new Date();
      const trialExpired = trialEndsAt ? now > trialEndsAt : true;

      const isPaid =
        subscription === "active" ||
        subscription === "paid" ||
        (subscription === "trial" && trialActive && !trialExpired);

      if (!isPaid) {
        router.replace("/billing/upgrade");
        return;
      }
    }
  }, [router, isLoggedIn, initializing, user]);

  // ===========================================================
  // 🚫 Prevent flashing protected pages before auth resolves
  // ===========================================================
  const isPublic = PUBLIC_ROUTES.includes(router.pathname);

  if (!initializing && !isPublic && !isLoggedIn) {
    return null;
  }

  // ===========================================================
  // 🎨 Render App Shell
  // ===========================================================
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
