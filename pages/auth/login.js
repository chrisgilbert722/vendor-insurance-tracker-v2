// pages/auth/login.js
import { useState, useEffect } from "react";
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

  // Where to redirect after login
  const redirect =
    typeof router.query.redirect === "string"
      ? router.query.redirect
      : "/dashboard";

  // If already logged in → redirect
  useEffect(() => {
    if (!initializing && isLoggedIn) {
      router.replace(redirect);
    }
  }, [initializing, isLoggedIn, redirect, router]);

  /* ==========================================
     GOOGLE OAUTH LOGIN (SUPABASE)
  ========================================== */
  async function signInWithGoogle() {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
            redirect
          )}`,
        },
      });

      if (error) {
        console.error("[google login error]", error);
        setError("Google sign-in failed.");
      }
    } catch (err) {
      console.error("[google login exception]", err);
      setError("Google sign-in failed.");
    }
  }

  /* ==========================================
     MAGIC LINK LOGIN
  ========================================== */
  async function sendMagicLink(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    try {
      setLoading(true);

      const finalRedirect =
        typeof router.query.redirect === "string"
          ? router.query.redirect
          : "/dashboard";

      const { error: linkError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
            finalRedirect
          )}`,
          shouldCreateUser: true,
        },
      });

      if (linkError) {
        console.error("[magic link error]", linkError);
        setError(linkError.message || "Could not send magic link.");
        return;
      }

      setSent(true);
    } catch (err) {
      console.error("[magic link exception]", err);
      setError("Could not send magic link.");
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
        }}
      />

      {/* CARD */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          padding: 20,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.98), 0 0 40px rgba(56,189,248,0.25)",
        }}
      >
        {/* HEADER */}
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
              <span style={{ fontSize: 10, color: "#9ca3af" }}>Login</span>
              <span style={{ fontSize: 10, color: "#38bdf8" }}>
                Secure Access
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
              Sign in to continue
            </h1>
          </div>
        </div>

        {/* GOOGLE LOGIN */}
        <button
          onClick={signInWithGoogle}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "10px 14px",
            border: "1px solid rgba(148,163,184,0.4)",
            background: "rgba(15,23,42,0.9)",
            color: "#e5e7eb",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          Continue with Google
        </button>

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#64748b",
            marginBottom: 10,
          }}
        >
          or
        </div>

        {/* MAGIC LINK */}
        {sent ? (
          <div style={{ marginTop: 20, fontSize: 14, textAlign: "center" }}>
            <p style={{ color: "#93c5fd" }}>
              ✔ Magic link sent! Check your inbox.
            </p>
            <p style={{ color: "#9ca3af", fontSize: 12 }}>
              (It may take 5–10 seconds to arrive.)
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink}>
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
                opacity: loading || !email.trim() ? 0.6 : 1,
                cursor:
                  loading || !email.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sending link…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
