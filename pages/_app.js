// pages/_app.js
import "../public/cockpit.css";
import { useRouter } from "next/router";
import { OrgProvider } from "../context/OrgContext";
import Layout from "../components/Layout";
import { UserProvider } from "../context/UserContext";
import AdminGuard from "../components/AdminGuard";

// Routes that must NEVER render Layout / Org / Guards
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/verify",
];

function AppShell({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname;

  // 🚫 ABSOLUTE HARD STOP FOR AUTH ROUTES
  if (AUTH_ROUTES.includes(path)) {
    return <Component {...pageProps} />;
  }

  const isAdminRoute = path.startsWith("/admin");

  const content = (
    <OrgProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </OrgProvider>
  );

  // 🔐 Admin routes only
  if (isAdminRoute) {
    return <AdminGuard>{content}</AdminGuard>;
  }

  return content;
}

export default function App(props) {
  return (
    <UserProvider>
      <AppShell {...props} />
    </UserProvider>
  );
}
