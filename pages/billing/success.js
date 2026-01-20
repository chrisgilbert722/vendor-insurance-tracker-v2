// pages/billing/success.js
// ============================================================
// BILLING SUCCESS — Verify session and activate trial
//
// HARD INVARIANTS (per mandate):
// ✅ Verify Stripe session ID (from URL)
// ✅ Update org: trial_started_at, trial_expires_at, stripe_customer_id
// ✅ ONE redirect to /dashboard after verification
// ❌ NO redirect to /billing or /onboarding
//
// FLOW:
// 1. Get session_id from URL
// 2. Call /api/billing/confirm-checkout to verify and activate trial
// 3. Redirect to /dashboard
// ============================================================

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BillingSuccess() {
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(3);

  // Prevent multiple calls
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    async function verifyAndActivate() {
      try {
        // Get session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          // No session - redirect to login
          console.log("[billing/success] No session, redirecting to login");
          window.location.href = "/auth/login?redirect=/dashboard";
          return;
        }

        // Get Stripe session_id from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");

        // Call confirm-checkout API to verify and activate trial
        const res = await fetch("/api/billing/confirm-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Failed to activate trial");
        }

        console.log("[billing/success] Trial activated:", json);
        setStatus("success");

        // Start countdown to dashboard
        const timer = setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              clearInterval(timer);
              window.location.href = "/dashboard";
              return 0;
            }
            return c - 1;
          });
        }, 1000);

      } catch (err) {
        console.error("[billing/success] Error:", err);
        setError(err.message);
        setStatus("error");

        // Still redirect to dashboard after delay - webhook may have worked
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 5000);
      }
    }

    verifyAndActivate();
  }, []);

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
      {status === "verifying" && (
        <>
          <div style={{ fontSize: 18, marginBottom: 12 }}>
            Activating your trial...
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Please wait while we set up your account
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #22c55e, #16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              boxShadow: "0 0 40px rgba(34,197,94,0.5)",
            }}
          >
            <span style={{ fontSize: 40 }}>✓</span>
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              marginBottom: 12,
              background: "linear-gradient(90deg, #22c55e, #86efac, #e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Payment Successful!
          </h1>

          <p style={{ fontSize: 16, color: "#9ca3af", marginBottom: 8 }}>
            Your 14-day free trial is now active.
          </p>

          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
            Redirecting to dashboard in {countdown}...
          </p>

          <button
            onClick={() => (window.location.href = "/dashboard")}
            style={{
              padding: "12px 24px",
              borderRadius: 999,
              border: "1px solid rgba(34,197,94,0.6)",
              background: "rgba(34,197,94,0.15)",
              color: "#22c55e",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Go to Dashboard Now →
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ color: "#fbbf24", fontSize: 18, marginBottom: 12 }}>
            Activation in Progress
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, maxWidth: 400 }}>
            {error || "Your payment was received. Trial activation is being processed."}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 24 }}>
            Redirecting to dashboard in 5 seconds...
          </div>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            style={{
              padding: "12px 24px",
              borderRadius: 999,
              border: "1px solid rgba(251,191,36,0.6)",
              background: "rgba(251,191,36,0.15)",
              color: "#fbbf24",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Go to Dashboard Now →
          </button>
          <p
            style={{
              fontSize: 11,
              color: "#4b5563",
              marginTop: 24,
              maxWidth: 400,
            }}
          >
            If your dashboard shows a trial prompt, please wait a moment and refresh.
            Your payment has been received.
          </p>
        </>
      )}
    </div>
  );
}
