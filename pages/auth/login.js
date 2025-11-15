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

    console.log("📨 SENDING OTP TO:", email);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://vendor-insurance-tracker-v2.vercel.app/auth/callback",
      },
    });

    console.log("📩 OTP SEND RESULT:", error || "Success");

    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    console.log("🔍 VERIFYING OTP NOW…");
    console.log("📧 Email:", email);
    console.log("🔢 Code entered:", code);

    // 🟢 VERIFY OTP WITH SUPABASE — WITH LOGGING
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    console.log("🧪 OTP VERIFY RESULT:", { data, error });

    setLoading(false);

    if (error) {
      console.log("❌ OTP ERROR:", error);
      setError(error.message || "Invalid code.");
      return;
    }

    // 🟢 SUPER IMPORTANT: STORE SESSION
    console.log("📦 STORING SESSION:", data.session);

    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    // 🟢 Sync user to Neon — WITH LOGS
    if (data.session?.user) {
      console.log("🔄 SYNCING USER TO NEON…", data.session.user);

      try {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: data.session.user }),
        });

        console.log("✅ SYNC COMPLETED");
      } catch (err) {
        console.error("❌ sync-user failed:", err);
      }
    }

    // 🟢 Redirect in-app
    console.log("➡️ REDIRECTING TO /dashboard");
    window.location.href = "/dashboard";
  }

  return (
    <div style={{ padding: "40px", maxWidth: "420px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "16px" }}>Sign In</h2>

      {step === "email" ? (
        <>
          <p>Enter your email and we’ll send you a login code.</p>

          <form onSubmit={handleSendCode}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
                background: "#111827",
                color: "white",
                border: "none",
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
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your code"
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
                background: "#111827",
                color: "white",
                border: "none",
              }}
            >
              {loading ? "Verifying..." : "Verify Code & Sign In"}
            </button>
          </form>

          <button
            style={{
              marginTop: "10px",
              background: "none",
              border: "none",
              color: "#2563eb",
              cursor: "pointer",
            }}
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
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
