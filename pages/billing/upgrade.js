// pages/billing/upgrade.js
import { useRouter } from "next/router";
import { useState } from "react";

export default function BillingUpgrade() {
  const router = useRouter();
  const { reason } = router.query;

  const [loading, setLoading] = useState(false);

  const message =
    reason === "expired"
      ? "Your 14-day trial has expired."
      : reason === "failed"
      ? "Your payment failed and your subscription is paused."
      : "Your subscription is not active.";

  function handleUpgrade() {
    setLoading(true);

    // Simulate Stripe redirect → go to fake success
    setTimeout(() => {
      router.push("/billing/success");
    }, 900);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        color: "#e5e7eb",
        position: "relative",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background:
            "radial-gradient(circle, rgba(255,120,0,0.25), transparent 60%)",
          filter: "blur(150px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* CARD */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          padding: 30,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.98), 0 0 45px rgba(248,113,113,0.22)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#f97316,#fb923c,#0f172a)",
              boxShadow: "0 0 30px rgba(248,113,113,0.45)",
            }}
          >
            <span style={{ fontSize: 22 }}>⚠️</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0))",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 10, color: "#9ca3af" }}>
                Billing Required
              </span>
              <span style={{ fontSize: 10, color: "#fb923c" }}>
                Subscription Locked
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              {message}
            </h1>

            <p style={{ marginTop: 6, fontSize: 13, color: "#cbd5f5" }}>
              To continue using the Vendor Insurance Tracker cockpit, you must
              activate a subscription below.
            </p>
          </div>
        </div>

        {/* Pricing Box */}
        <div
          style={{
            marginTop: 14,
            marginBottom: 20,
            borderRadius: 16,
            border: "1px solid rgba(51,65,85,0.8)",
            background: "rgba(15,23,42,0.9)",
            padding: 18,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: "#e5e7eb",
              marginBottom: 6,
            }}
          >
            Pro Plan — $399/mo
          </h2>

          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              color: "#9ca3af",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <li>Unlimited COI uploads</li>
            <li>AI compliance scanning</li>
            <li>Automated expiration tracking</li>
            <li>Unlimited vendors</li>
            <li>Multi-organization dashboard</li>
            <li>Premium support</li>
          </ul>
        </div>

        {/* Upgrade Button */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: "100%",
            borderRadius: "999px",
            padding: "12px 16px",
            border: "1px solid rgba(59,130,246,0.9)",
            background:
              "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
            color: "#e0f2fe",
            fontSize: 15,
            fontWeight: 600,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Redirecting…" : "Activate Subscription →"}
        </button>

        <p
          style={{
            marginTop: 10,
            textAlign: "center",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          Secure checkout · Cancel anytime · No hidden fees
        </p>
      </div>
    </div>
  );
}
