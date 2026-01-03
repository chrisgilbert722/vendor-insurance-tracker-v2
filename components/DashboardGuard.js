import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { useOrg } from "../context/OrgContext";

export default function DashboardGuard({ children }) {
  const router = useRouter();
  const { initializing, isLoggedIn } = useUser();
  const { loading, activeOrg } = useOrg();

  useEffect(() => {
    if (initializing || loading) return;

    // 🔐 Not logged in → login
    if (!isLoggedIn) {
      router.replace("/auth/login");
      return;
    }

    // 🏢 No org yet → onboarding
    if (!activeOrg) {
      router.replace("/onboarding/ai-wizard");
      return;
    }

    // 🚧 Onboarding not complete → onboarding
    if (!activeOrg.onboarding_completed) {
      router.replace("/onboarding/ai-wizard");
      return;
    }
  }, [initializing, loading, isLoggedIn, activeOrg, router]);

  if (initializing || loading) return null;
  if (!activeOrg || !activeOrg.onboarding_completed) return null;

  return children;
}
