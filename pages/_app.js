// pages/_app.js
import "../public/cockpit.css";
import { UserProvider } from "../context/UserContext";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";

/**
 * SAFE BOOT MODE
 * - No redirects
 * - No onboarding enforcement
 * - No AdminGuard
 * - No conditional hooks
 * Goal: app must load again, always.
 */
export default function App({ Component, pageProps }) {
  return (
    <UserProvider>
      <OrgProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </OrgProvider>
    </UserProvider>
  );
}
