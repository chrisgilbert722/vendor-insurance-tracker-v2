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
   GLOBAL APP GUARD — SINGLE SOURCE OF TRUTH
   - Blocks ALL navigation until onboarding is complete
   - Catches sidebar clicks, deep links, refreshes
   - Self-serve safe (no manual steps per customer)
============================================================ */
function AppGuard({ children }) {
  const router = useRouter();
  const { initializing, isLoggedIn } = useUser();
  const { loading, activeOrg } = useOrg();

  useEffect(() => {
    if (initializing || loading) return;

    // 🔐 Not logged in → login
    if (!isLoggedIn) {
      if (!router.pathname.startsWith("/auth")) {
        router.replace("/auth/login");
      }
      return;
    }

    // 🚧 No org yet → onboarding
    if (!activeOrg) {
      if (router.pathname !== "/onboarding/ai-wizard") {
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    // 🚧 Onboarding not complete → onboarding
    if (!activeOrg.onboarding_completed) {
      if (router.pathname !== "/onboarding/ai-wizard") {
        router.replace("/onboarding/ai-wizard");
      }
      return;
    }

    // ✅ Onboarding complete
    // If user is still on onboarding, send them to dashboard
    if (router.pathname === "/onboarding/ai-wizard") {
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

  // ⛔ Block render until state is resolved
  if (initializing || loading) return null;
  if (!isLoggedIn) return null;
  if (!activeOrg || !activeOrg.onboarding_completed) return null;

  return children;
}

/* ============================================================
   APP ROOT
============================================================ */
export default function App({ Component, pageProps }) {
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
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </AppGuard>
        </OrgProvider>
      </UserProvider>
    </>
  );
}
