// pages/_app.js
import "../public/cockpit.css";
import Script from "next/script";

import { UserProvider } from "../context/UserContext";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";

/* ============================================================
   GLOBAL APP GUARD — PASSIVE (NO REDIRECTS)
   - NO auth redirects
   - NO org redirects
   - NO onboarding logic
   - Pages own their own flow
============================================================ */
function AppGuard({ children }) {
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
