// pages/_app.js
import "../public/cockpit.css";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { UserProvider, useUser } from "../context/UserContext";
import { OrgProvider, useOrg } from "../context/OrgContext";
import Layout from "../components/Layout";

/* ============================================================
   GLOBAL APP GUARD — ROUTING ONLY
   - Public-first
   - Onboarding enforced post-login
   - No render blocking
   - No loops
============================================================ */
function AppGuard({ children }) {
  const router = useRouter();
  const { initializing, isLoggedIn } = useUser();
  const { loading, activeOrg } = useOrg();

  useEffect(() => {
    if (initializing || loading) return;

    const path = router.pathname;

    const isAuth = path.startsWith("/auth");
    const isOnboarding = path.startsWith("/onboarding");

    const isPublic =
      path === "/" ||
      path.startsWith("/pricing") ||
      path.startsWith("/property-management") ||
      path.startsWith("/terms") ||
      path.startsWith("/privacy");

    /* ------------------------------------------------------------
       LOGGED OUT USERS
       - Always allowed on public pages
       - Never forced to login
    ------------------------------------------------------------ */
    if (!isLoggedIn) {
      if (!isPublic && !isAuth) {
        router.replace("/");
      }
      return;
    }

    /* ------------------------------------------------------------
       LOGGED IN USERS
    ------------------------------------------------------------ */

    // No org yet → onboarding
    if (!activeOrg && !isOnboarding) {
      router.replace("/onboarding/ai-wizard");
      return;
    }

    // Onboarding incomplete → force onboarding
    if (
      activeOrg &&
      !activeOrg.onboarding_completed &&
      !isOnboarding
    ) {
      router.replace("/onboarding/ai-wizard");
      return;
    }

    // Onboarding complete → escape onboarding
    if (
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

  return children;
}

/* ============================================================
   APP ROOT
============================================================ */
export default function App({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname;

  const isAuthRoute = path.startsWith("/auth");
  const isOnboardingRoute = path.startsWith("/onboarding");

  const isPublicRoute =
    path === "/" ||
    path.startsWith("/pricing") ||
    path.startsWith("/property-management") ||
    path.startsWith("/terms") ||
    path.startsWith("/privacy");

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
            {/* PUBLIC / AUTH / ONBOARDING → NO SIDEBAR */}
            {isPublicRoute || isAuthRoute || isOnboardingRoute ? (
              <Component {...pageProps} />
            ) : (
              /* APP ROUTES → FULL LAYOUT */
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
