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

  const redirect =
    typeof router.query.redirect === "string"
      ? router.query.redirect
      : "/dashboard";

  // Redirect if already logged in
  useEffect(() => {
    if (!initializing && isLoggedIn) {
      router.replace(redirect);
    }
  }, [initializing, isLoggedIn, redirect, router]);

  // ==============================
  // MAGIC LINK LOGIN (UNCHANGED)
  // ==============================
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
        setError(linkError.message || "Could not send magic link.");
        return;
      }

      setSent(true);
    } catch {
      setError("Could not send magic link.");
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // GOOGLE LOGIN (SUPABASE — FIXED)
  // ==============================
  async function signInWithGoogle() {
    try {
      setLoading(true);
      setError("");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("[login] google error:", error);
        setError(error.message || "Google sign-in failed.");
      }
    } catch (err) {
      console.error("[login] google unexpected:", err);
      setError("Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 16px",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
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
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>
          Sign in
        </h1>

        {/* GOOGLE LOGIN */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "10px 14px",
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(15,23,42,0.9)",
            color: "#e5e7eb",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 14,
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
          <div style={{ fontSize: 14, textAlign: "center" }}>
            ✔ Magic link sent! Check your inbox.
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
            />

            {error && (
              <div style={{ color: "#fecaca", fontSize: 12, marginBottom: 8 }}>
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
                cursor: "pointer",
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
