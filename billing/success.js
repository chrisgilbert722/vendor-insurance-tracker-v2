// pages/billing/success.js
// LOCKED: Billing Success Handoff
// - No account creation here
// - No magic link sending here
// - If logged in -> go dashboard
// - If not logged in -> send to login

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function BillingSuccess() {
  const router = useRouter();
  const [msg, setMsg] = useState("Finalizing activation…");

  useEffect(() => {
    let cancelled = false;

    async function go() {
      try {
        setMsg("Checking your session…");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        // ✅ If they’re logged in, go straight to dashboard
        if (session?.user) {
          if (cancelled) return;
          setMsg("Activation complete — sending you to the dashboard…");
          setTimeout(() => router.replace("/dashboard"), 700);
          return;
        }

        // ✅ If not logged in, send them to login
        // (No magic-link creation here — keeps flow stable)
        if (cancelled) return;
        setMsg("Almost done — please log in to continue…");
        setTimeout(() => router.replace("/auth/login"), 900);
      } catch (err) {
        console.error("[billing/success] unexpected:", err);
        if (cancelled) return;
        setMsg("Something went wrong. Please log in again.");
        setTimeout(() => router.replace("/auth/login"), 1200);
      }
    }

    go();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#e5e7eb",
        fontSize: 18,
      }}
    >
      <div
        style={{
          padding: 24,
          borderRadius: 22,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow:
            "0 20px 45px rgba(15,23,42,0.96),0 0 26px rgba(56,189,248,0.25)",
          textAlign: "center",
          width: "90%",
          maxWidth: 420,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Automation Activated
        </div>
        <div style={{ color: "#9ca3af", fontSize: 14, marginBottom: 14 }}>
          Your trial is active. Redirecting you now…
        </div>
        <div>{msg}</div>
      </div>
    </div>
  );
}
