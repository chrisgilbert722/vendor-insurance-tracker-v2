// pages/_app.js
import "../public/cockpit.css";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { UserProvider } from "../context/UserContext";
import { OrgProvider, useOrg } from "../context/OrgContext";
import { useUser } from "../context/UserContext";
import Layout from "../components/Layout";

/* ============================================================
   GLOBAL APP GUARD — ROUTING ONLY (NO RENDER BLOCK)
   - Single source of truth
   - Self-serve safe
   - Billing → Onboarding → Dashboard
============================================================ */
function AppGuard({ children }) {
  const router = useRouter();
  const { initializing, isLoggedIn } = useUser();
  const { loading, activeOrg } = useOrg();

  useEffect(() => {
    if (initializing || loading) return;

    const path = router.pathname;

    const isAuth =
      path.startsWith("/auth");

    const isOnboarding =
      path.startsWith("/onboarding");

    const isPublic =
      path === "/" ||
      path.startsWith("/pricing") ||
      path.startsWith("/property-management") ||
      path.startsWith("/terms") ||
      path.startsWith("/privacy");

    /* --------------------------------------------------------
       1️⃣ LOGGED OUT USERS
       - Allow public pages
       - Force login for app routes
    -------------------------------------------------------- */
    if (!isLoggedIn) {
      if (!isPublic && !isAuth) {
        router.replace("/auth/login");
      }
      return;
    }

    /* --------------------------------------------------------
       2️⃣ LOGGED IN — NO ORG YET
       - Always go to onboarding
    -------------------------------------------------------- */
    if (isLoggedIn && !activeOrg) {
      if (!isOnboarding) {
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    /* --------------------------------------------------------
       3️⃣ ONBOARDING NOT COMPLETE
       - Lock app until finished
    -------------------------------------------------------- */
    if (
      isLoggedIn &&
      activeOrg &&
      !activeOrg.onboarding_completed
    ) {
      if (!isOnboarding) {
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    /* --------------------------------------------------------
       4️⃣ ONBOARDING COMPLETE
       - Never allow onboarding again
    -------------------------------------------------------- */
    if (
      isLoggedIn &&
      activeOrg?.onboarding_completed &&
      isOnboarding
    ) {
      router.replace("/dashboard");
    }
  }, [
    initializing,
    loading,
    isLoggedIn,
    activeOrg,
    router.pathname,
    router,
  ]);

  // ❗ NEVER block rendering — routing only
  return children;
}

/* ============================================================
   APP ROOT
============================================================ */
export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isOnboardingRoute = router.pathname.startsWith("/onboarding");

  return (
    <>
      {/* Google Analytics (GA4) */}
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-M5YME3TEQ1"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-M5YME3TEQ1');
        `}
      </Script>

      <UserProvider>
        <OrgProvider>
          <AppGuard>
            {isOnboardingRoute ? (
              // 🚀 ONBOARDING — NO SIDEBAR / NO LAYOUT
              <Component {...pageProps} />
            ) : (
              // 🧠 APPLICATION SHELL
              <Layout>
                <Component {...pageProps} />
              </Layout>
            )}
          </AppGuard>
        </OrgProvider>
      </UserProvider>
    </>
  );
}
