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
        emailRedirectTo:
          "https://vendor-insurance-tracker-v2.vercel.app/auth/callback",
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
      setError("Invalid code. Try again.");
      return;
    }

    window.location.href = "/auth/callback";
  }

  return (
    <div style={{ padding: "40px", maxWidth: "420px", margin: "0 auto" }}>
      <h2>Sign In</h2>

      {step === "email" ? (
        <>
          <p>Enter your email and we’ll send you a login code.</p>

          <form onSubmit={handleSendCode}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
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
                cursor: "pointer",
              }}
            >
              {loading ? "Sending..." : "Send Login Code"}
            </button>
          </form>

          {error && <p style={{ color: "red" }}>❌ {error}</p>}
        </>
      ) : (
        <>
          <p>Enter the code we emailed to <b>{email}</b>.</p>

          <form onSubmit={handleVerifyCode}>
            <input
              type="text"
              placeholder="6–8 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "12px",
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
                background: "#111827",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
            >
              {loading ? "Verifying..." : "Verify Code & Sign In"}
            </button>
          </form>

          <button
            onClick={() => {
              setStep("email");
              setCode("");
            }}
            style={{
              marginTop: "10px",
              background: "none",
              color: "#2563eb",
              cursor: "pointer",
            }}
          >
            ← Use a different email
          </button>

          {error && <p style={{ color: "red" }}>❌ {error}</p>}
        </>
      )}
    </div>
  );
}
