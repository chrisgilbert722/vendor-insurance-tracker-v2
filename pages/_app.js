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
   - Handles redirects
   - NEVER hides children
============================================================ */
function AppGuard({ children }) {
  const router = useRouter();
  const { initializing, isLoggedIn } = useUser();
  const { loading, activeOrg } = useOrg();

  useEffect(() => {
    if (initializing || loading) return;

    const isOnboarding = router.pathname.startsWith("/onboarding");
    const isAuth = router.pathname.startsWith("/auth");

    // 🔐 Not logged in → login
    if (!isLoggedIn && !isAuth) {
      router.replace("/auth/login");
      return;
    }

    // 🚧 Logged in but no org yet → onboarding
    if (isLoggedIn && !activeOrg && !isOnboarding) {
      router.replace("/onboarding/ai-wizard");
      return;
    }

    // 🚧 Onboarding incomplete → force onboarding
    if (
      isLoggedIn &&
      activeOrg &&
      !activeOrg.onboarding_completed &&
      !isOnboarding
    ) {
      router.replace("/onboarding/ai-wizard");
      return;
    }

    // ✅ Onboarding complete → escape onboarding
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

  // ❗ NEVER block rendering
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
              // 🚀 ONBOARDING: NO LAYOUT, NO SIDEBAR
              <Component {...pageProps} />
            ) : (
              // 🧠 APP: DASHBOARD SHELL
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
