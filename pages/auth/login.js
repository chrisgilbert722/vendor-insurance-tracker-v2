// pages/auth/login.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useUser } from "../../context/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn, initializing } = useUser();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect =
    typeof router.query.redirect === "string"
      ? router.query.redirect
      : "/dashboard";

  // If already logged in, bounce away from login
  useEffect(() => {
    if (!initializing && isLoggedIn) {
      router.replace(redirect);
    }
  }, [initializing, isLoggedIn, redirect, router]);

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    try {
      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true, // auto-create user if not exists
        },
      });

      if (signInError) {
        console.error("[login] signInWithOtp error:", signInError);
        setError(signInError.message || "Could not send code.");
        return;
      }

      setSent(true);
      // Jump to verify page with email + redirect
      router.push(
        `/auth/verify?email=${encodeURIComponent(
          email.trim()
        )}&redirect=${encodeURIComponent(redirect)}`
      );
    } catch (err) {
      console.error("[login] unexpected error:", err);
      setError("Could not send code. Please try again.");
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
                Email Code
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
              Enter your email to receive a{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                6-digit login code
              </span>
              .
            </h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSendCode} style={{ marginTop: 10 }}>
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
            disabled={loading}
          />

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
            disabled={loading || !email.trim()}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "9px 14px",
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e5f2ff",
              fontSize: 13,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor:
                loading || !email.trim() ? "not-allowed" : "pointer",
              opacity: loading || !email.trim() ? 0.6 : 1,
              marginBottom: 10,
            }}
          >
            {loading ? "Sending code…" : "Send login code"}
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
            Need an account?{" "}
            <span style={{ color: "#93c5fd" }}>
              (Signup will be connected to billing at launch)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
