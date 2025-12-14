// components/AdminGuard.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useRole } from "../lib/useRole";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const { isLoggedIn, initializing } = useUser();
  const { isAdmin, isManager } = useRole();

  useEffect(() => {
    if (initializing) return;

    // Not logged in → login
    if (!isLoggedIn) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    // Logged in but not admin/manager → dashboard
    if (!isAdmin && !isManager) {
      router.replace("/dashboard");
    }
  }, [initializing, isLoggedIn, isAdmin, isManager, router]);

  // Block render while checking
  if (initializing || !isLoggedIn || (!isAdmin && !isManager)) {
    return null;
  }

  return children;
}
