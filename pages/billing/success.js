// pages/billing/success.js
// ============================================================
// BILLING SUCCESS — AUTHORITATIVE ONBOARDING FINALIZATION
// Stripe success = onboarding complete. No polling. No retries.
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function BillingSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState("finalizing");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function finalizeAndRedirect() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          // No session - redirect to login
          router.replace("/auth/login");
          return;
        }

        // AUTHORITATIVE: Finalize onboarding NOW
        const res = await fetch("/api/billing/finalize-onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const json = await res.json();

        if (cancelled) return;

        if (!json.ok) {
          console.error("[billing/success] Finalize failed:", json.error);
          // Still redirect to dashboard - let guard handle it
        }

        setStatus("success");

        // IMMEDIATE redirect to dashboard - no delays, no polling
        setTimeout(() => {
          if (!cancelled) {
            window.location.href = "/dashboard";
          }
        }, 1000);
      } catch (err) {
        if (cancelled) return;
        console.error("[billing/success] Error:", err);
        setError(err.message);
        setStatus("error");

        // Even on error, try to redirect to dashboard after delay
        setTimeout(() => {
          if (!cancelled) {
            window.location.href = "/dashboard";
          }
        }, 3000);
      }
    }

    // Start immediately
    finalizeAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [router]);

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
      }}
    >
      {status === "finalizing" && (
        <>
          <div>Activating your account...</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Please wait
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ color: "#22c55e", fontSize: 20 }}>
            Welcome to Verivo!
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Redirecting to dashboard...
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ color: "#facc15" }}>
            Setting up your account...
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            {error || "Redirecting shortly..."}
          </div>
        </>
      )}
    </div>
  );
}
