// pages/billing/success.js
// ============================================================
// BILLING SUCCESS — Simple redirect to dashboard
// Does NOT verify trial status (webhook handles persistence)
// Dashboard will show BillingGate if trial not yet active
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function BillingSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Simple countdown then redirect to dashboard
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

    return () => clearInterval(timer);
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
        Your 14-day free trial is being activated.
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

      <p
        style={{
          fontSize: 11,
          color: "#4b5563",
          marginTop: 32,
          maxWidth: 400,
        }}
      >
        If your dashboard shows a trial prompt, please wait a moment and refresh.
        Your payment has been received.
      </p>
    </div>
  );
}
