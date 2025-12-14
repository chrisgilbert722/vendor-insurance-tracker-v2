// components/AdminGuard.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useRole } from "../lib/useRole";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const { isLoggedIn, initializing } = useUser();
  const { ready, isAdmin, isManager } = useRole();

  useEffect(() => {
    // ⛔ Wait until BOTH auth + role are ready
    if (initializing || !ready) return;

    // 🔐 Not logged in → login
    if (!isLoggedIn) {
      router.replace(
        `/auth/login?redirect=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    // 🚫 Logged in but insufficient role → dashboard
    if (!isAdmin && !isManager) {
      router.replace("/dashboard");
    }
  }, [
    initializing,
    ready,
    isLoggedIn,
    isAdmin,
    isManager,
    router,
    router.asPath, // ✅ IMPORTANT
  ]);

  // ⛔ Block render until decision is FINAL
  if (initializing || !ready) {
    return null;
  }

  if (!isLoggedIn || (!isAdmin && !isManager)) {
    return null;
  }

  return children;
}
