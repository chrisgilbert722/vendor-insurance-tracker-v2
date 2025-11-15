import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // 1️⃣ Send OTP to email
  async function sendOtp(e) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          "https://vendor-insurance-tracker-v2.vercel.app/auth/callback",
      },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  // 2️⃣ Verify OTP Code
  async function verifyOtp(e) {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) {
      setError(error.message);
      return;
    }

    // SUCCESS → redirect to dashboard
    window.location.href = "/dashboard";
  }

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Sign In</h2>

      {!sent ? (
        <>
          <p>Enter your email to receive your login code:</p>
          <form onSubmit={sendOtp}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
            />
            <button type="submit" style={{ width: "100%", padding: "10px" }}>
              Send Login Code
            </button>
          </form>
        </>
      ) : (
        <>
          <p>Enter the code we emailed to you:</p>
          <form onSubmit={verifyOtp}>
            <input
              type="text"
              placeholder="6–8 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
            />
            <button type="submit" style={{ width: "100%", padding: "10px" }}>
              Verify Code
            </button>
          </form>
        </>
      )}

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
    </div>
  );
}
