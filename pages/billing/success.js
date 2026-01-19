// pages/billing/success.js
// ============================================================
// BILLING SUCCESS — AUTHORITATIVE TRIAL ACTIVATION
// Waits for backend confirmation before redirecting to dashboard
// Does NOT redirect on error - shows retry option instead
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function BillingSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState("activating");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function activateTrialAndRedirect() {
      try {
        // Get session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          router.replace("/auth/login?redirect=/billing/success");
          return;
        }

        // Get Stripe session_id from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");

        // Call confirm-checkout to activate trial
        const res = await fetch("/api/billing/confirm-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        const json = await res.json();

        if (cancelled) return;

        if (!json.ok) {
          throw new Error(json.error || "Failed to activate trial");
        }

        // SUCCESS - Trial is now active in database
        console.log("[billing/success] Trial activated:", json);
        setStatus("success");

        // Redirect to dashboard after brief success message
        setTimeout(() => {
          if (!cancelled) {
            window.location.href = "/dashboard";
          }
        }, 1500);

      } catch (err) {
        if (cancelled) return;
        console.error("[billing/success] Error:", err);
        setError(err.message);
        setStatus("error");
        // DO NOT auto-redirect on error - let user retry
      }
    }

    activateTrialAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Retry handler
  const handleRetry = () => {
    setStatus("activating");
    setError("");
    window.location.reload();
  };

  // Manual continue to dashboard
  const handleContinue = () => {
    window.location.href = "/dashboard";
  };

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
        fontSize: 16,
        gap: 12,
        padding: 24,
      }}
    >
      {status === "activating" && (
        <>
          <div style={{ fontSize: 20 }}>Activating your trial...</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Please wait while we set up your account
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ color: "#22c55e", fontSize: 24, fontWeight: 600 }}>
            Welcome to Verivo!
          </div>
          <div style={{ fontSize: 14, color: "#9ca3af" }}>
            Your 14-day trial is now active
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
            Redirecting to dashboard...
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ color: "#f87171", fontSize: 18 }}>
            Activation Issue
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#9ca3af",
              maxWidth: 400,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {error || "There was a problem activating your trial."}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={handleRetry}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid rgba(34,197,94,0.6)",
                background: "rgba(34,197,94,0.15)",
                color: "#22c55e",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Retry Activation
            </button>
            <button
              onClick={handleContinue}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "rgba(15,23,42,0.9)",
                color: "#9ca3af",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Continue Anyway
            </button>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginTop: 16,
              maxWidth: 350,
              textAlign: "center",
            }}
          >
            If this persists, your payment was successful.
            Contact support and we'll activate your account manually.
          </div>
        </>
      )}
    </div>
  );
}
