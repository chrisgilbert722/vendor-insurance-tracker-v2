// pages/onboarding/ai-wizard.js
// ============================================================
// AI Onboarding Wizard V5 — CANONICAL ONBOARDING ENTRY POINT
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../context/OrgContext";
import AiWizardPanel from "../../components/onboarding/AiWizardPanel";
import AuthHeader from "../../components/AuthHeader";

export default function AiOnboardingWizardPage() {
  const router = useRouter();

  const {
    activeOrgUuid,
    activeOrg,
    orgs,
    setActiveOrg,
    loading: orgLoading,
  } = useOrg();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);

  /* -------------------------------------------------
     🔐 SESSION GATE (MAGIC-LINK SAFE)

     Uses onAuthStateChange to properly detect session hydration
     after magic-link redirect. getSession() alone returns null
     during the async token exchange.
  -------------------------------------------------- */
  useEffect(() => {
    let alive = true;
    let redirecting = false;

    // Handler for auth state changes
    function handleSession(session) {
      if (!alive || redirecting) return;

      if (session?.access_token) {
        setHasSession(true);
        setCheckingSession(false);
      } else {
        // No session after hydration — redirect to login
        redirecting = true;
        router.replace("/auth/login?redirect=/onboarding/ai-wizard");
      }
    }

    // 1) Subscribe to auth state changes (catches magic-link hydration)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // SIGNED_IN fires after magic-link token exchange completes
      // INITIAL_SESSION fires on page load if already authenticated
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        handleSession(session);
      } else if (event === "SIGNED_OUT") {
        if (!alive || redirecting) return;
        redirecting = true;
        router.replace("/auth/login?redirect=/onboarding/ai-wizard");
      }
    });

    // 2) Also check current session (handles already-authenticated users)
    //    This runs immediately; if session exists, we're done.
    //    If null, we wait for onAuthStateChange to fire.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive || redirecting) return;

      if (session?.access_token) {
        handleSession(session);
      }
      // If no session, don't redirect yet — wait for onAuthStateChange
      // Magic-link flow will trigger SIGNED_IN event shortly
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [router]);

  /* -------------------------------------------------
     🏢 AUTO-CREATE ORG IF USER DOESN'T HAVE ONE

     Uses cookie-based auth — no Authorization header needed.
     Supabase session cookie is sent automatically by browser.
  -------------------------------------------------- */
  useEffect(() => {
    if (checkingSession || creatingOrg) return;
    if (!hasSession) return;

    // If org already exists or was just created, do nothing
    if ((orgs && orgs.length > 0) || activeOrgUuid) return;

    let cancelled = false;
    setCreatingOrg(true);

    async function createOrg() {
      try {
        // Cookie-based auth: browser sends session cookie automatically
        const res = await fetch("/api/orgs/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Ensure cookies are sent
        });

        const json = await res.json();
        if (cancelled) return;

        if (json?.org) {
          setActiveOrg(json.org);

          if (json.org.external_uuid) {
            localStorage.setItem(
              "verivo:activeOrgUuid",
              json.org.external_uuid
            );
          }
          if (json.org.id) {
            localStorage.setItem(
              "verivo:activeOrgId",
              String(json.org.id)
            );
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
  }, [checkingSession, hasSession, orgs, activeOrgUuid, creatingOrg, setActiveOrg]);

  /* -------------------------------------------------
     🚫 REDIRECT IF ONBOARDING ALREADY COMPLETE
  -------------------------------------------------- */
  useEffect(() => {
    if (!activeOrg) return;

    if (activeOrg.onboarding_completed === true) {
      router.replace("/dashboard");
    }
  }, [activeOrg, router]);

  /* -------------------------------------------------
     ⏳ WAIT STATES
     IMPORTANT: Only block on checkingSession
  -------------------------------------------------- */
  if (checkingSession) {
    return (
      <div style={{ minHeight: "100vh", background: "#020617" }}>
        <AuthHeader />
        <div style={{ padding: 40, color: "#9ca3af" }}>
          Loading onboarding…
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return null; // redirecting
  }

  if (!activeOrgUuid) {
    return (
      <div style={{ minHeight: "100vh", background: "#020617" }}>
        <AuthHeader />
        <div style={{ padding: 40, color: "#9ca3af" }}>
          Setting up your organization…
        </div>
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
        color: "#e5e7eb",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
      }}
    >
      <AuthHeader />
      <div style={{ padding: "32px 40px" }}>
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
          <AiWizardPanel orgId={activeOrgUuid} />
        </div>
      </div>
    </div>
  );
}
