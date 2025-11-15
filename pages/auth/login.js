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

    console.log("📨 Sending OTP to:", email);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://vendor-insurance-tracker-v2.vercel.app/auth/callback",
      },
    });

    setLoading(false);

    if (error) {
      console.error("❌ OTP Send Error:", error);
      setError(error.message);
    } else {
      console.log("✅ OTP Sent Successfully");
      setStep("code");
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("🔐 Verifying code:", code);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      console.error("❌ OTP Verification Error:", error);
      setError(error.message || "Invalid code.");
      setLoading(false);
      return;
    }

    console.log("✅ OTP Verified:", data.session);

    // Store session in Supabase
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    // Sync user to Neon
    if (data.session?.user) {
      try {
        console.log("🌐 Syncing user to NEON...");
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: data.session.user }),
        });
        console.log("✅ User synced to Neon");
      } catch (err) {
        console.error("❌ sync-user failed:", err);
      }
    }

    // Redirect
    console.log("➡️ Redirecting to dashboard...");
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
          <p>Enter the code we emailed to <b>{email}</b>.</p>

          <form onSubmit={handleVerifyCode}>
            <input
              type="text"
              placeholder="Enter your code"
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
            onClick={() => {
              setStep("email");
              setError("");
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

      {error && (
        <p style={{ color: "red", marginTop: "12px" }}>❌ {error}</p>
      )}
    </div>
  );
}
