// pages/_app.js
import "../public/cockpit.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";

// Public routes with NO login required
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/signup",
  "/auth/verify",
  "/billing/start",
  "/billing/success",
  "/billing/upgrade",
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { user, isLoggedIn, initializing } = useUser();

  useEffect(() => {
    if (initializing) return;

    const path = router.pathname;
    const isPublic = PUBLIC_ROUTES.includes(path);

    // -------------------------------------------------------
    // 1️⃣ Not logged in → Redirect to Login
    // -------------------------------------------------------
    if (!isPublic && !isLoggedIn) {
      const redirectTo = encodeURIComponent(router.asPath || "/dashboard");
      router.replace(`/auth/login?redirect=${redirectTo}`);
      return;
    }

    // -------------------------------------------------------
    // 2️⃣ Logged in → Check Trial / Subscription Status
    // -------------------------------------------------------
    if (isLoggedIn && !isPublic) {
      const meta = user?.user_metadata || {};

      const trialActive = meta.trial_active === true;
      const subscription = meta.subscription_status || "none";

      const trialEndsAt = meta.trial_ends_at
        ? new Date(meta.trial_ends_at)
        : null;

      const now = new Date();
      const trialExpired = trialEndsAt ? now > trialEndsAt : true;

      const isPaid =
        subscription === "active" ||
        subscription === "active_trial" ||
        (subscription === "trialing" && trialActive && !trialExpired);

      if (!isPaid) {
        // User logged in but unpaid → send to paywall
        router.replace("/billing/upgrade");
        return;
      }
    }
  }, [router, isLoggedIn, initializing, user]);

  // -------------------------------------------------------
  // Prevent flashing protected pages before auth resolves
  // -------------------------------------------------------
  const currentPath = router.pathname;
  const isPublic = PUBLIC_ROUTES.includes(currentPath);

  if (!isPublic && !isLoggedIn && !initializing) {
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
