// pages/_app.js
import "../public/cockpit.css";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { UserProvider, useUser } from "../context/UserContext";
import { OrgProvider, useOrg } from "../context/OrgContext";
import Layout from "../components/Layout";

/* ============================================================
   GLOBAL APP GUARD — SAFE VERSION
   - NO redirects during async loading
   - NO org enforcement here
   - Onboarding page owns onboarding logic
   - Prevents hydration loops
============================================================ */
function AppGuard({ children }) {
  const router = useRouter();
  const { initializing, isLoggedIn } = useUser();
  const { loading } = useOrg();

  useEffect(() => {
    // 🚫 NEVER redirect while resolving auth or orgs
    if (initializing || loading) return;

    const path = router.pathname;

    const isAuth = path.startsWith("/auth");
    const isOnboarding = path.startsWith("/onboarding");
    const isBilling = path.startsWith("/billing");

    const isPublic =
      path === "/" ||
      path.startsWith("/pricing") ||
      path.startsWith("/property-management") ||
      path.startsWith("/terms") ||
      path.startsWith("/privacy");

    /* ------------------------------------------------------------
       LOGGED OUT USERS
    ------------------------------------------------------------ */
    if (!isLoggedIn) {
      if (!isPublic && !isAuth) {
        router.replace("/");
      }
      return;
    }

    /* ------------------------------------------------------------
       LOGGED IN USERS
       (NO onboarding enforcement here)
    ------------------------------------------------------------ */

    // Logged-in users can access onboarding freely
    if (isOnboarding || isBilling) return;

    // Everything else allowed
  }, [initializing, loading, isLoggedIn, router.pathname, router]);

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
