// pages/billing/checkout.js
// ============================================================
// BILLING CHECKOUT PAGE — Redirects to Stripe Checkout
// - Requires auth (redirects to login if not authenticated)
// - Calls /api/billing/create-checkout
// - Redirects to Stripe checkout URL
// - Shows error + "Try Again" on failure
// - NEVER redirects to /dashboard or /onboarding
// ============================================================

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../context/OrgContext";

export default function BillingCheckout() {
  const { activeOrgUuid } = useOrg();

  const [status, setStatus] = useState("loading"); // loading | waiting | error
  const [error, setError] = useState("");

  // REDIRECT GUARD: Prevent multiple redirects per mount
  const redirectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function initiateCheckout() {
      // Guard: only one redirect per mount
      if (redirectedRef.current) return;

      try {
        // -------------------------------------------
        // 1. REQUIRE AUTH
        // -------------------------------------------
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          redirectedRef.current = true;
          console.log("[billing/checkout] REDIRECT: no session → /auth/login");
          window.location.href = "/auth/login?redirect=/billing/checkout";
          return;
        }

        // -------------------------------------------
        // 2. WAIT FOR ORG CONTEXT
        // -------------------------------------------
        if (!activeOrgUuid) {
          setStatus("waiting");
          return; // useEffect will re-run when activeOrgUuid changes
        }

        setStatus("loading");

        // -------------------------------------------
        // 3. CALL CREATE-CHECKOUT API
        // -------------------------------------------
        const res = await fetch("/api/billing/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orgId: activeOrgUuid }),
        });

        const json = await res.json();

        if (cancelled) return;

        if (!json.ok || !json.url) {
          throw new Error(json.error || "Could not create checkout session");
        }

        // -------------------------------------------
        // 4. REDIRECT TO STRIPE
        // -------------------------------------------
        redirectedRef.current = true;
        console.log("[billing/checkout] REDIRECT: checkout created → Stripe");
        window.location.href = json.url;

      } catch (err) {
        if (cancelled) return;
        console.error("[billing/checkout]", err);
        setError(err.message || "Failed to start checkout");
        setStatus("error");
      }
    }

    initiateCheckout();

    return () => {
      cancelled = true;
    };
  }, [activeOrgUuid]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top,#020617 0%,#000 60%)",
        color: "#e5e7eb",
        padding: 24,
        textAlign: "center",
      }}
    >
      {status === "loading" && (
        <>
          <div style={{ fontSize: 18, marginBottom: 12 }}>
            Preparing checkout...
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            You will be redirected to secure payment
          </div>
        </>
      )}

      {status === "waiting" && (
        <>
          <div style={{ fontSize: 18, marginBottom: 12 }}>
            Loading organization...
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Please wait
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ color: "#f87171", fontSize: 16, marginBottom: 16 }}>
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "1px solid rgba(56,189,248,0.5)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
