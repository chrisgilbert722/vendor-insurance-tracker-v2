// pages/billing/checkout.js
// ============================================================
// BILLING CHECKOUT PAGE — Redirects to Stripe Checkout
// This page is shown when user needs to start/complete subscription
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../context/OrgContext";

export default function BillingCheckout() {
  const router = useRouter();
  const { activeOrgUuid } = useOrg();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initiateCheckout() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          router.replace("/auth/login?redirect=/billing/checkout");
          return;
        }

        // Wait for org to be available
        if (!activeOrgUuid) {
          // Retry after a short delay
          setTimeout(initiateCheckout, 500);
          return;
        }

        // Check if user already has active trial/subscription
        // If so, skip checkout and go to dashboard
        const trialRes = await fetch(`/api/billing/trial-status?orgId=${activeOrgUuid}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const trialData = await trialRes.json();

        if (cancelled) return;

        if (trialData.ok && trialData.hasStartedTrial && trialData.trial?.active) {
          // User already has active trial or subscription → go to dashboard
          router.replace("/dashboard");
          return;
        }

        // Create Stripe Checkout Session
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

        // Redirect to Stripe Checkout
        window.location.href = json.url;
      } catch (err) {
        if (cancelled) return;
        console.error("[billing/checkout]", err);
        setError(err.message || "Failed to start checkout");
        setLoading(false);
      }
    }

    initiateCheckout();

    return () => {
      cancelled = true;
    };
  }, [activeOrgUuid, router]);

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
      }}
    >
      {loading && !error && (
        <>
          <div style={{ fontSize: 18, marginBottom: 12 }}>
            Preparing checkout...
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            You will be redirected to secure payment
          </div>
        </>
      )}

      {error && (
        <>
          <div style={{ color: "#f87171", fontSize: 16, marginBottom: 12 }}>
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid rgba(56,189,248,0.5)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
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
