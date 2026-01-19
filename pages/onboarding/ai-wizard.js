// pages/onboarding/ai-wizard.js
// ============================================================
// AI Onboarding Wizard — PRODUCTION-GRADE STATE MACHINE
// - Uses /api/orgs/bootstrap as single source of truth
// - No direct org creation — bootstrap handles everything
// - Hard timeout prevents infinite hangs
// - Uses refs to avoid stale closures in timeouts
// ============================================================

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../context/OrgContext";
import AiWizardPanel from "../../components/onboarding/AiWizardPanel";
import AuthHeader from "../../components/AuthHeader";

// State machine states
const STATE = {
  CHECKING_SESSION: "checking_session",
  BOOTSTRAPPING: "bootstrapping",
  READY: "ready",
  REDIRECTING: "redirecting",
  ERROR: "error",
};

export default function AiOnboardingWizardPage() {
  const router = useRouter();
  const { setActiveOrg } = useOrg();

  const [state, setState] = useState(STATE.CHECKING_SESSION);
  const [orgUuid, setOrgUuid] = useState(null);
  const [error, setError] = useState(null);

  // Refs to avoid stale closures in timeouts
  const aliveRef = useRef(true);
  const bootstrapCalledRef = useRef(false);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    aliveRef.current = true;
    bootstrapCalledRef.current = false;

    // -------------------------------------------
    // BOOTSTRAP FUNCTION — Single API call
    // -------------------------------------------
    async function bootstrap(accessToken) {
      // Guard against double-call
      if (bootstrapCalledRef.current) return;
      bootstrapCalledRef.current = true;

      if (!aliveRef.current) return;
      setState(STATE.BOOTSTRAPPING);

      try {
        const res = await fetch("/api/orgs/bootstrap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!aliveRef.current) return;

        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Bootstrap failed");
        }

        const org = json.org;

        // Update context and localStorage
        setActiveOrg(org);
        if (org.external_uuid) {
          localStorage.setItem("verivo:activeOrgUuid", org.external_uuid);
        }
        if (org.id) {
          localStorage.setItem("verivo:activeOrgId", String(org.id));
        }

        // Handle action from bootstrap
        // IMPORTANT: After onboarding complete, redirect to billing (not dashboard)
        // This prevents routing loops between dashboard/onboarding/billing
        if (json.action === "redirect_dashboard") {
          setState(STATE.REDIRECTING);
          router.replace("/billing/checkout");
          return;
        }

        // Ready to show wizard
        setOrgUuid(org.external_uuid);
        setState(STATE.READY);

      } catch (err) {
        if (!aliveRef.current) return;
        console.error("[ai-wizard] Bootstrap error:", err);
        setError(err.message);
        setState(STATE.ERROR);
      }
    }

    // -------------------------------------------
    // SESSION HANDLER
    // -------------------------------------------
    function handleSession(session) {
      if (!aliveRef.current) return;

      if (session?.access_token) {
        bootstrap(session.access_token);
      } else {
        // No session — redirect to login
        setState(STATE.REDIRECTING);
        router.replace("/auth/login?redirect=/onboarding/ai-wizard");
      }
    }

    // -------------------------------------------
    // AUTH STATE SUBSCRIPTION
    // -------------------------------------------
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!aliveRef.current) return;

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        handleSession(session);
      } else if (event === "SIGNED_OUT") {
        setState(STATE.REDIRECTING);
        router.replace("/auth/login?redirect=/onboarding/ai-wizard");
      }
    });

    // Store subscription in ref for cleanup
    subscriptionRef.current = subscription;

    // Also check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!aliveRef.current) return;
      if (session?.access_token) {
        handleSession(session);
      }
      // If no session, wait for onAuthStateChange
    });

    // -------------------------------------------
    // HARD TIMEOUT — Prevent infinite hangs
    // -------------------------------------------
    const timeoutId = setTimeout(() => {
      if (!aliveRef.current) return;
      if (!bootstrapCalledRef.current) {
        console.error("[ai-wizard] Hard timeout: no session after 10s");
        setError("Session timeout. Please refresh or log in again.");
        setState(STATE.ERROR);
      }
    }, 10000);

    // -------------------------------------------
    // CLEANUP
    // -------------------------------------------
    return () => {
      aliveRef.current = false;
      clearTimeout(timeoutId);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [router, setActiveOrg]);

  // -------------------------------------------
  // RENDER BASED ON STATE
  // -------------------------------------------

  if (state === STATE.CHECKING_SESSION || state === STATE.BOOTSTRAPPING) {
    return (
      <div style={{ minHeight: "100vh", background: "#020617" }}>
        <AuthHeader />
        <div style={{ padding: 40, color: "#9ca3af" }}>
          {state === STATE.CHECKING_SESSION
            ? "Checking session…"
            : "Setting up your organization…"}
        </div>
      </div>
    );
  }

  if (state === STATE.REDIRECTING) {
    return null;
  }

  if (state === STATE.ERROR) {
    return (
      <div style={{ minHeight: "100vh", background: "#020617" }}>
        <AuthHeader />
        <div style={{ padding: 40 }}>
          <div style={{ color: "#f87171", marginBottom: 16 }}>
            {error || "Something went wrong"}
          </div>
          <button
            onClick={() => router.replace("/auth/login?redirect=/onboarding/ai-wizard")}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,0.5)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // STATE.READY
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
          <AiWizardPanel orgId={orgUuid} />
        </div>
      </div>
    </div>
  );
}
