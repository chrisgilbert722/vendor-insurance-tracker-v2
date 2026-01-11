// pages/billing/activate.js
// LOCKED: Start Stripe Checkout for "Activate Automation"
// - Requires logged-in Supabase session
// - Requires active Neon organization (external_uuid)
// - Sends orgId explicitly
// - Fires ONCE and never silently redirects back to onboarding

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../context/OrgContext";

export default function BillingActivate() {
  const router = useRouter();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();

  const startedRef = useRef(false);

  const [msg, setMsg] = useState("Preparing secure checkout…");
  const [error, setError] = useState("");

  useEffect(() => {
    // 🚫 Wait until org context is fully loaded
    if (loadingOrgs) return;

    // 🚫 Prevent double-run (React strict mode / rerenders)
    if (startedRef.current) return;

    // 🚫 Must have org
    if (!orgId) {
      setError("No organization selected. Please select an organization first.");
      setMsg("Activation blocked.");
      return;
    }

    startedRef.current = true;

    async function startCheckout() {
      try {
        setError("");
        setMsg("Opening Stripe checkout…");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setMsg("Please log in to continue…");
          router.replace("/auth/login");
          return;
        }

        const res = await fetch("/api/billing/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orgId }), // ✅ REQUIRED
        });

        const json = await res.json();

        if (!json?.ok || !json?.url) {
          throw new Error(json?.error || "Could not start Stripe checkout.");
        }

        // ✅ Redirect to Stripe (NO other navigation allowed)
        window.location.href = json.url;
      } catch (err) {
        console.error("[billing/activate]", err);
        setError(err.message || "Checkout failed.");
        setMsg("Activation failed.");
      }
    }

    startCheckout();
  }, [orgId, loadingOrgs, router]);

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
