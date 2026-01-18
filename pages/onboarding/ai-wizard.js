// pages/onboarding/ai-wizard.js
// ============================================================
// AI Onboarding Wizard V5 — CANONICAL ONBOARDING ENTRY POINT
// ✅ Session required (redirects to login if missing)
// ✅ Auto-creates org if user doesn't have one
// ✅ Single onboarding UI for all users
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
    orgs,
    setActiveOrg,
    loading: orgLoading,
  } = useOrg();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);

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
     🏢 AUTO-CREATE ORG IF USER DOESN'T HAVE ONE
  -------------------------------------------------- */
  useEffect(() => {
    if (checkingSession || orgLoading || creatingOrg) return;
    if (!hasSession) return;

    // If user has orgs, no need to create
    if (orgs && orgs.length > 0) return;

    // Auto-create org
    let cancelled = false;
    setCreatingOrg(true);

    async function createOrg() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token || cancelled) return;

        const res = await fetch("/api/orgs/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const json = await res.json();

        if (cancelled) return;

        if (json.ok && json.org) {
          setActiveOrg(json.org);

          // Store org info
          if (json.org.external_uuid) {
            localStorage.setItem("verivo:activeOrgUuid", json.org.external_uuid);
          }
          if (json.org.id) {
            localStorage.setItem("verivo:activeOrgId", String(json.org.id));
          }
        }
      } catch (err) {
        console.error("[ai-wizard] Failed to create org:", err);
      } finally {
        if (!cancelled) setCreatingOrg(false);
      }
    }

    createOrg();

    return () => {
      cancelled = true;
    };
  }, [checkingSession, orgLoading, hasSession, orgs, creatingOrg, setActiveOrg]);

  /* -------------------------------------------------
     🧠 ACTIVATE ORG VIA API (if org exists but not active)
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

        if (org) {
          setActiveOrg(org);
        }
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
  if (checkingSession || orgLoading || creatingOrg) {
    return (
      <div style={{ padding: 40, color: "#9ca3af" }}>
        Loading onboarding…
      </div>
    );
  }

  if (!hasSession) {
    return null; // redirecting to login
  }

  // Still waiting for org to be created/loaded
  if (!activeOrgUuid) {
    return (
      <div style={{ padding: 40, color: "#9ca3af" }}>
        Setting up your organization…
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
