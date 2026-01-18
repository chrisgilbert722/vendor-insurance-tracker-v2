// pages/onboarding/start.js
// ============================================================
// DEPRECATED — Redirects to canonical onboarding entry point
// ============================================================

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function OnboardingStartRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/ai-wizard");
  }, [router]);

  return null;
}
