import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function BillingSuccess() {
  const router = useRouter();
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    async function verifyTrial() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          // No session - wait for webhook to process
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(verifyTrial, 1000);
            return;
          }
          throw new Error("Session expired");
        }

        const res = await fetch("/api/billing/trial-status", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const json = await res.json();

        if (cancelled) return;

        // Check if trial was successfully created by webhook
        if (json.ok && json.hasStartedTrial && json.trial?.active) {
          setStatus("success");
          // Trial confirmed - redirect to dashboard
          setTimeout(() => {
            router.replace("/dashboard");
          }, 1500);
        } else if (attempts < maxAttempts) {
          // Trial not yet created - webhook may still be processing
          attempts++;
          setTimeout(verifyTrial, 1000);
        } else {
          // Max attempts reached - still redirect but warn
          console.warn("[billing/success] Trial not confirmed after max attempts");
          setStatus("success");
          setTimeout(() => {
            router.replace("/dashboard");
          }, 1500);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[billing/success]", err);
        setError(err.message);
        setStatus("error");
      }
    }

    // Start verification after short delay for webhook processing
    const t = setTimeout(verifyTrial, 1500);

    return () => {
      cancelled = true;
      clearTimeout(t);
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
        background:
          "radial-gradient(circle at top,#020617 0%,#000 60%)",
        color: "#e5e7eb",
        fontSize: 16,
        gap: 12,
      }}
    >
      {status === "verifying" && (
        <>
          <div>Finalizing your subscription...</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Setting up your 14-day trial
          </div>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ color: "#22c55e" }}>Trial activated!</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Redirecting to dashboard...
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ color: "#f87171" }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>{error}</div>
          <button
            onClick={() => router.replace("/onboarding/ai-wizard")}
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
            Return to Setup
          </button>
        </>
      )}
    </div>
  );
}
