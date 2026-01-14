// pages/onboarding/ai-wizard.js
// ============================================================
// AI Onboarding Wizard V5 — UUID-SAFE + SESSION-GATED
// ✅ Blocks until Supabase session exists
// ✅ Redirects to /auth/login if missing
// ✅ Activates org via API (NO supabase.from organizations)
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../context/OrgContext";
import AiWizardPanel from "../../components/onboarding/AiWizardPanel";

export default function AiOnboardingWizardPage() {
  const router = useRouter();

  const {
    activeOrgUuid,
    setActiveOrg,
    loading: orgLoading,
  } = useOrg();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  /* -------------------------------------------------
     🔐 SESSION GATE (HARD)
  -------------------------------------------------- */
  useEffect(() => {
    let alive = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (!session?.access_token) {
        router.replace("/auth/login?redirect=/onboarding/ai-wizard");
        return;
      }

      setHasSession(true);
      setCheckingSession(false);
    }

    checkSession();

    return () => {
      alive = false;
    };
  }, [router]);

  /* -------------------------------------------------
     🧠 ACTIVATE ORG VIA API (CORRECT SOURCE OF TRUTH)
  -------------------------------------------------- */
  useEffect(() => {
    if (!activeOrgUuid || orgLoading) return;

    let cancelled = false;

    async function activate() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) return;

        const res = await fetch("/api/orgs/for-user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          console.error("Failed to load orgs during onboarding");
          return;
        }

        const json = await res.json();
        if (!json?.ok || !Array.isArray(json.orgs)) return;

        if (cancelled) return;

        const org = json.orgs.find(
          (o) => o.external_uuid === activeOrgUuid
        );

        if (!org) {
          console.error(
            "Active org UUID not found in org list:",
            activeOrgUuid
          );
          return;
        }

        // 🔥 THIS IS THE LINE THAT MAKES THE APP COME ALIVE
        setActiveOrg(org);
      } catch (err) {
        console.error("Failed to activate org during onboarding", err);
      }
    }

    activate();

    return () => {
      cancelled = true;
    };
  }, [activeOrgUuid, orgLoading, setActiveOrg]);

  /* -------------------------------------------------
     ⏳ WAIT STATES
  -------------------------------------------------- */
  if (checkingSession || orgLoading) {
    return (
      <div style={{ padding: 40, color: "#9ca3af" }}>
        Loading onboarding…
      </div>
    );
  }

  if (!hasSession) {
    return null; // redirecting
  }

  if (!activeOrgUuid) {
    return (
      <div
        style={{
          padding: 24,
          margin: 40,
          borderRadius: 16,
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(239,68,68,0.6)",
          color: "#fecaca",
        }}
      >
        Invalid organization context. Please re-select your organization.
      </div>
    );
  }

  /* -------------------------------------------------
     ✅ RENDER WIZARD
  -------------------------------------------------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px",
        color: "#e5e7eb",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
      }}
    >
      <div
        style={{
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: "0 0 60px rgba(15,23,42,0.95)",
        }}
      >
        {/* UUID is still correct for wizard */}
        <AiWizardPanel orgId={activeOrgUuid} />
      </div>
    </div>
  );
}
