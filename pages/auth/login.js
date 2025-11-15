import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://vendor-insurance-tracker-v2.vercel.app/auth/callback",
      },
    });

    setLoading(false);

    if (error) setError(error.message);
    else setStep("code");
  }

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
      await fetch("/api/auth/sync-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: data.session.user }),
      });
    }

    window.location.href = "/dashboard";
  }

  return (
    <div style={{ padding: "40px", maxWidth: "420px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "16px" }}>Sign In</h2>

      {step === "email" ? (
        <>
          <p>Enter your email and we'll send you a login code.</p>
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
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
              }}
            >
              {loading ? "Sending..." : "Send Login Code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p>Enter the code we emailed to <b>{email}</b>.</p>
          <form onSubmit={handleVerifyCode}>
            <input
              type="text"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
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
                background: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
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

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
    </div>
  );
}
