// pages/billing/start.js
import { useRouter } from "next/router";
import { useState } from "react";

export default function BillingStart() {
  const router = useRouter();
  const { email, name, company } = router.query;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFakeStripe() {
    setError("");
    setLoading(true);

    // Simulate a "successful payment" delay
    setTimeout(() => {
      router.push(
        `/billing/success?email=${encodeURIComponent(
          email
        )}&name=${encodeURIComponent(name)}&company=${encodeURIComponent(
          company
        )}`
      );
    }, 1200);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 20px",
        color: "#e5e7eb",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: "-260px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "900px",
          height: "900px",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.35), transparent 60%)",
          filter: "blur(160px)",
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
          maxWidth: "520px",
          borderRadius: "24px",
          padding: "30px",
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0px 24px 60px rgba(15,23,42,0.95), 0px 0px 45px rgba(56,189,248,0.22)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              padding: "12px",
              borderRadius: "999px",
              background:
                "radial-gradient(circle at 30% 0,#6366f1,#38bdf8,#0f172a)",
              boxShadow: "0 0 30px rgba(56,189,248,0.45)",
            }}
          >
            <span style={{ fontSize: 22 }}>💳</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0))",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#9ca3af",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                }}
              >
                Step 2 of 2
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "#38bdf8",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Billing Setup
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
              Activate Your{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                14-Day Free Trial
              </span>
            </h1>

            <p style={{ marginTop: 6, fontSize: 13, color: "#9ca3af" }}>
              Your card will be charged after the trial unless you cancel.
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div
          style={{
            marginTop: "12px",
            marginBottom: "18px",
            borderRadius: "14px",
            border: "1px solid rgba(51,65,85,0.75)",
            background: "rgba(15,23,42,0.95)",
            padding: "14px",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 4 }}>
            <span style={{ color: "#93c5fd" }}>Plan:</span>{" "}
            <span style={{ fontWeight: 500 }}>Pro — $399/mo</span>
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            User: <span style={{ color: "#e5e7eb" }}>{name}</span>
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Company: <span style={{ color: "#e5e7eb" }}>{company}</span>
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            Email: <span style={{ color: "#e5e7eb" }}>{email}</span>
          </div>
        </div>

        {error && (
          <div
            style={{
            marginBottom: 14,
            padding: "8px 10px",
            borderRadius: "10px",
            border: "1px solid rgba(248,113,113,0.8)",
            background: "rgba(127,29,29,0.9)",
            color: "#fecaca",
            fontSize: 12,
          }}
        >
          {error}
        </div>
        )}

        {/* Fake Stripe Button */}
        <button
          onClick={handleFakeStripe}
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
          {loading ? "Processing…" : "Start Trial & Enter Payment →"}
        </button>

        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          Secure checkout · Cancel anytime · No hidden fees
        </div>
      </div>
    </div>
  );
}
