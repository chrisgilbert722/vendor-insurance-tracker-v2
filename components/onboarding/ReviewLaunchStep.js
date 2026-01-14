// components/onboarding/ReviewLaunchStep.js
// ============================================================
// STEP 10 — Finish & Activate (FAIL-OPEN, NO STRIPE)
// - Marks onboarding complete
// - Redirects to dashboard
// - NO dependency on AI, rules, vendors, or plans
// ============================================================

import { useState } from "react";
import { useRouter } from "next/router";

export default function ReviewLaunchStep({ orgId }) {
  const router = useRouter();

  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  async function finishOnboarding() {
    if (!orgId) {
      setError("Organization not found.");
      return;
    }

    setLaunching(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to activate system");

      // ✅ SUCCESS → DASHBOARD
      router.replace("/dashboard");
    } catch (err) {
      console.error("[Finish Onboarding]", err);
      setError("Could not activate system. Please try again.");
      setLaunching(false);
    }
  }

  return (
    <div
      style={{
        padding: 28,
        borderRadius: 20,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
        maxWidth: 760,
      }}
    >
      <h2
        style={{
          marginTop: 0,
          fontSize: 24,
          fontWeight: 700,
          color: "#e5e7eb",
        }}
      >
        You’re ready to activate 🚀
      </h2>

      <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 20 }}>
        Your workspace is set up. You can now enter the dashboard and continue
        configuring alerts, rules, and billing.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 10,
            background: "rgba(127,29,29,0.85)",
            border: "1px solid rgba(248,113,113,0.8)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={finishOnboarding}
        disabled={launching}
        style={{
          padding: "14px 32px",
          borderRadius: 999,
          border: "1px solid rgba(59,130,246,0.9)",
          background:
            "radial-gradient(circle at top left,#3b82f6,#2563eb,#1e3a8a)",
          color: "#e0f2fe",
          fontSize: 16,
          fontWeight: 700,
          cursor: launching ? "not-allowed" : "pointer",
          width: "100%",
          opacity: launching ? 0.6 : 1,
        }}
      >
        {launching ? "Activating…" : "Finish & Go to Dashboard →"}
      </button>
    </div>
  );
}
