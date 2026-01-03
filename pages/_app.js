// pages/_app.js
import "../public/cockpit.css";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { UserProvider } from "../context/UserContext";
import { OrgProvider, useOrg } from "../context/OrgContext";
import { useUser } from "../context/UserContext";
import Layout from "../components/Layout";

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

    // 🔓 Logged out users: allow public + auth pages
    if (!isLoggedIn) {
      if (!isPublic && !isAuth) router.replace("/auth/login");
      return;
    }

    // ✅ Logged in: enforce org + onboarding gates
    if (!activeOrg && !isOnboarding) {
      router.replace("/onboarding/ai-wizard");
      return;
    }

    if (activeOrg && !activeOrg.onboarding_completed && !isOnboarding) {
      router.replace("/onboarding/ai-wizard");
      return;
    }

    if (activeOrg?.onboarding_completed && isOnboarding) {
      router.replace("/dashboard");
    }
  }, [initializing, loading, isLoggedIn, activeOrg, router.pathname, router]);

  return children;
}

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
            {/* ✅ Public + Auth + Onboarding routes: NO Layout */}
            {isPublicRoute || isAuthRoute || isOnboardingRoute ? (
              <Component {...pageProps} />
            ) : (
              /* ✅ App routes only */
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
