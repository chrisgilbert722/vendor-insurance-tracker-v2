import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Send OTP Code
  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      // absolutely REQUIRED for Supabase OTP redirects
      options: {
        emailRedirectTo: "https://vendor-insurance-tracker-v2.vercel.app/auth/callback",
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep("code");
    }
  }

  // Verify the OTP Code
  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Invalid code.");
      return;
    }

    // Sync user to Neon
    if (data?.session?.user) {
      try {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: data.session.user }),
        });
      } catch (err) {
        console.error("sync-user failed:", err);
      }
    }

    window.location.href = "/dashboard";
  }

  return (
    <div style={{ padding: "40px", maxWidth: "420px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "16px" }}>Sign In</h2>

      {step === "email" ? (
        <>
          <p style={{ marginBottom: "12px" }}>
            Enter your email and we'll send you a login code.
          </p>

          <form onSubmit={handleSendCode}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Sending..." : "Send Login Code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p style={{ marginBottom: "12px" }}>
            Enter the code we emailed to <strong>{email}</strong>.
          </p>

          <form onSubmit={handleVerifyCode}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6–8 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                letterSpacing: "4px",
                fontFamily: "monospace",
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "4px",
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {loading ? "Verifying..." : "Verify Code & Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
            style={{
              marginTop: "10px",
              background: "none",
              border: "none",
              color: "#2563eb",
              cursor: "pointer",
            }}
          >
            ← Use a different email
          </button>
        </>
      )}

      {error && (
        <p style={{ color: "red", marginTop: "12px" }}>❌ {error}</p>
      )}
    </div>
  );
}
