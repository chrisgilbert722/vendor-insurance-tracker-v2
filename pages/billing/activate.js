// pages/billing/activate.js
// LOCKED: Start Stripe Checkout for "Activate Automation"
// - Requires logged-in Supabase session
// - Redirects to Stripe Checkout URL returned by API

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function BillingActivate() {
  const router = useRouter();
  const [msg, setMsg] = useState("Preparing secure checkout…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setMsg("Please log in to activate automation…");
          router.replace("/auth/login");
          return;
        }

        setMsg("Opening Stripe checkout…");

        const res = await fetch("/api/billing/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        });

        const json = await res.json();
        if (!json?.ok || !json?.url) {
          throw new Error(json?.error || "Could not start checkout.");
        }

        if (cancelled) return;
        window.location.href = json.url;
      } catch (e) {
        console.error("[billing/activate]", e);
        if (cancelled) return;
        setError(e.message || "Checkout failed.");
        setMsg("Could not open checkout.");
      }
    }

    start();
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
          maxWidth: 520,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>
          Activate Automation
        </div>
        <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 14 }}>
          14-day trial • $499/mo after • Cancel anytime • Card required
        </div>

        <div style={{ fontSize: 14 }}>{msg}</div>

        {error && (
          <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 14, color: "#64748b", fontSize: 12 }}>
          You will not be charged today.
        </div>
      </div>
    </div>
  );
}
