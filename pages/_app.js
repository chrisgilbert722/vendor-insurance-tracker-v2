// pages/_app.js
import "../public/cockpit.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider, useUser } from "../context/UserContext";

const PUBLIC_ROUTES = ["/auth/login", "/auth/verify"];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const { isLoggedIn, initializing } = useUser();

  useEffect(() => {
    if (initializing) return;

    const isPublic = PUBLIC_ROUTES.includes(router.pathname);

    if (!isPublic && !isLoggedIn) {
      const redirectTo = encodeURIComponent(router.asPath || "/dashboard");
      router.replace(`/auth/login?redirect=${redirectTo}`);
    }
  }, [router, isLoggedIn, initializing]);

  // While checking session / redirecting: avoid flashing protected pages
  if (!isLoggedIn && !PUBLIC_ROUTES.includes(router.pathname) && !initializing) {
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
