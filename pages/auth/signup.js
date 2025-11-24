// pages/auth/signup.js
import { useState } from "react";
import { useRouter } from "next/router";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.company || !form.email) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);

    // For now → send user to fake Stripe
    router.push(
      `/billing/start?name=${encodeURIComponent(
        form.name
      )}&company=${encodeURIComponent(
        form.company
      )}&email=${encodeURIComponent(form.email)}`
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
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
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.4), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* CARD */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          borderRadius: 24,
          padding: 26,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.98), 0 0 40px rgba(56,189,248,0.25)",
        }}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div
            style={{
              padding: 12,
              borderRadius: "999px",
              background:
                "radial-gradient(circle at 30% 0,#38bdf8,#6366f1,#0f172a)",
              boxShadow: "0 0 30px rgba(56,189,248,0.6)",
            }}
          >
            <span style={{ fontSize: 20 }}>🚀</span>
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
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 10, color: "#9ca3af" }}>
                Create Account
              </span>
              <span style={{ fontSize: 10, color: "#38bdf8" }}>
                Start Free Trial
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
              Start your{" "}
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
              No commitment · Cancel anytime · Card required to activate trial
            </p>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
          {/* Name */}
          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              display: "block",
            }}
          >
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="John Smith"
            style={field}
          />

          {/* Company */}
          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              marginTop: 12,
              display: "block",
            }}
          >
            Company Name
          </label>
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={handleChange}
            placeholder="Acme Construction"
            style={field}
          />

          {/* Email */}
          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              marginTop: 12,
              display: "block",
            }}
          >
            Work Email
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@company.com"
            style={field}
          />

          {error && (
            <div
              style={{
                marginTop: 12,
                marginBottom: 10,
                padding: "7px 9px",
                borderRadius: 10,
                background: "rgba(127,29,29,0.9)",
                border: "1px solid rgba(248,113,113,0.8)",
                color: "#fecaca",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 18,
              width: "100%",
              borderRadius: 999,
              padding: "10px 16px",
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontSize: 14,
              fontWeight: 500,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Continue to Billing →
          </button>
        </form>
      </div>
    </div>
  );
}

const field = {
  width: "100%",
  borderRadius: 999,
  padding: "9px 12px",
  border: "1px solid rgba(51,65,85,0.9)",
  background: "rgba(15,23,42,0.96)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
};
