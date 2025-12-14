// components/AdminGuard.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useRole } from "../lib/useRole";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const { isLoggedIn, initializing } = useUser();
  const role = useRole(); // includes loading + flags

  useEffect(() => {
    // ⏳ Wait until BOTH auth + role are resolved
    if (initializing || role.loading) return;

    // 🔐 Not logged in → login
    if (!isLoggedIn) {
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    // 🚫 Logged in but not admin/manager → dashboard
    if (!role.isAdmin && !role.isManager) {
      router.replace("/dashboard");
    }
  }, [
    initializing,
    role.loading,
    isLoggedIn,
    role.isAdmin,
    role.isManager,
    router,
  ]);

  // ⛔ Block render until auth + role are fully known
  if (initializing || role.loading) {
    return null;
  }

  if (!isLoggedIn) {
    return null;
  }

  if (!role.isAdmin && !role.isManager) {
    return null;
  }

  // ✅ Authorized admin content
  return children;
}
