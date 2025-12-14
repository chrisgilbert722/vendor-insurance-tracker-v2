import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useRole } from "../lib/useRole";

export default function AdminGuard({ children }) {
  const router = useRouter();
  const { isLoggedIn, initializing } = useUser();
  const { loading, isAdmin, isManager } = useRole();

  useEffect(() => {
    // Wait until EVERYTHING is loaded
    if (initializing || loading) return;

    if (!isLoggedIn) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (!isAdmin && !isManager) {
      router.replace("/dashboard");
    }
  }, [initializing, loading, isLoggedIn, isAdmin, isManager, router]);

  // BLOCK render ONLY while loading
  if (initializing || loading) {
    return null;
  }

  if (!isLoggedIn || (!isAdmin && !isManager)) {
    return null;
  }

  return children;
}
