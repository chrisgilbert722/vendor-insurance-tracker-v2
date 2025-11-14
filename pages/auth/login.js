import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSent(false);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Sign In</h2>

      {sent ? (
        <p>Check your email for the login link.</p>
      ) : (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Enter your email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
          />

          <button type="submit" style={{ width: "100%", padding: "10px" }}>
            Send Magic Link
          </button>
        </form>
      )}

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
    </div>
  );
}
