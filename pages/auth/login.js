// pages/auth/login.js
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      // TODO: wire backend
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      setError("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 16px",
        color: "#e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* Ambient Aura */}
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

      {/* Card */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          padding: 20,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.98),0 0 40px rgba(56,189,248,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#38bdf8,#6366f1,#0f172a)",
              boxShadow: "0 0 30px rgba(56,189,248,0.6)",
            }}
          >
            <span style={{ fontSize: 20 }}>🔐</span>
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
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                }}
              >
                Login
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Secure access
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              Welcome back to{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                your cockpit
              </span>
              .
            </h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              display: "block",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "8px 11px",
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 13,
              outline: "none",
              marginBottom: 10,
            }}
          />

          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              display: "block",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "8px 11px",
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 13,
              outline: "none",
              marginBottom: 6,
            }}
          />

          <div
            style={{
              fontSize: 11,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              color: "#6b7280",
            }}
          >
            <div />
            <Link href="/auth/forgot" style={{ color: "#93c5fd" }}>
              Forgot password?
            </Link>
          </div>

          {error && (
            <div
              style={{
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
              width: "100%",
              borderRadius: 999,
              padding: "9px 14px",
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "#9ca3af",
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" style={{ color: "#93c5fd" }}>
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
