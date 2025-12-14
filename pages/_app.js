// pages/_app.js
import "../public/cockpit.css";
import { useRouter } from "next/router";
import { UserProvider, useUser } from "../context/UserContext";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import AdminGuard from "../components/AdminGuard";

/* ============================================================
   ROUTES
============================================================ */
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify",
];

/* ============================================================
   AUTH-ONLY WRAPPER (NO LAYOUT)
============================================================ */
function AuthOnly({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

/* ============================================================
   APP WRAPPER (WITH LAYOUT)
============================================================ */
function AppWithLayout({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname;

  const { isLoggedIn, initializing } = useUser();

  // ⛔ Block while auth resolves
  if (initializing) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e5e7eb",
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        }}
      >
        Loading…
      </div>
    );
  }

  // 🔐 Redirect unauthenticated users
  if (!isLoggedIn) {
    router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  const content = (
    <OrgProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </OrgProvider>
  );

  // 🔐 Admin routes ONLY
  if (path.startsWith("/admin")) {
    return <AdminGuard>{content}</AdminGuard>;
  }

  return content;
}

/* ============================================================
   ROOT APP
============================================================ */
export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAuthRoute = PUBLIC_ROUTES.some((r) =>
    router.pathname.startsWith(r)
  );

  return (
    <UserProvider>
      {isAuthRoute ? (
        <AuthOnly Component={Component} pageProps={pageProps} />
      ) : (
        <AppWithLayout Component={Component} pageProps={pageProps} />
      )}
    </UserProvider>
  );
}
