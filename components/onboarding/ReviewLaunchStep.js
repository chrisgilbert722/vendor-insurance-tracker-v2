// components/onboarding/ReviewLaunchStep.js
// STEP 4 — Finish Setup → Dashboard
// ✅ Context-safe
// ✅ No hard dependency on OrgContext shape
// ✅ Never throws "is not a function"

import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useOrg } from "../../context/OrgContext";

export default function ReviewLaunchStep({ orgId }) {
  const router = useRouter();
  const orgCtx = useOrg(); // 👈 DO NOT destructure blindly

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function finishOnboarding() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please refresh.");
      }

      // 1️⃣ Mark onboarding complete (fail-open)
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orgId }),
      }).catch(() => {});

      // 2️⃣ SAFELY set active org if setter exists
      if (typeof orgCtx?.setActiveOrgUuid === "function") {
        orgCtx.setActiveOrgUuid(orgId);
      }

      // 3️⃣ Always persist (dashboard reads this on boot)
      try {
        localStorage.setItem("activeOrgUuid", orgId);
      } catch {}

      // 4️⃣ Go to dashboard
      router.replace("/dashboard");
    } catch (err) {
      console.error("[Finish Onboarding]", err);
      setError(err.message || "Could not finish setup");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 20,
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(71,85,105,0.8)",
      }}
    >
      <h2 style={{ color: "#e5e7eb", marginTop: 0 }}>
        Setup Complete 🎉
      </h2>

      <p style={{ color: "#9ca3af", fontSize: 14 }}>
        Your vendors are loaded and analyzed.
        You can now access your compliance dashboard.
      </p>

      {error && (
        <div
          style={{
            marginTop: 12,
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
        onClick={finishOnboarding}
        disabled={loading}
        style={{
          marginTop: 18,
          width: "100%",
          padding: "14px 24px",
          borderRadius: 999,
          border: "1px solid rgba(34,197,94,0.9)",
          background: "linear-gradient(90deg,#22c55e,#16a34a)",
          color: "#022c22",
          fontSize: 16,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Finishing setup…" : "Continue → Dashboard"}
      </button>
    </div>
  );
}
