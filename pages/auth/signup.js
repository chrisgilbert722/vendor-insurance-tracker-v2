// pages/auth/signup.js
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.company || !form.email) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);

    try {
      // ✅ AUTH ONLY — NO ORG CREATION HERE
      const { error } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // ✅ Success — magic link sent
      setSent(true);
    } catch (err) {
      setError(err.message || "Unable to send login link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 20px",
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          borderRadius: 24,
          padding: 26,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.98), 0 0 40px rgba(56,189,248,0.25)",
        }}
      >
        {!sent ? (
          <>
            <h1 style={{ fontSize: 26, marginBottom: 6 }}>
              Start your{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                14-Day Free Trial
              </span>
            </h1>

            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
              Full access · No credit card · Cancel anytime
            </p>

            <form onSubmit={handleSubmit}>
              <label style={label}>Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                style={field}
              />

              <label style={{ ...label, marginTop: 12 }}>
                Company Name
              </label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                style={field}
              />

              <label style={{ ...label, marginTop: 12 }}>
                Work Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                style={field}
              />

              {error && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "8px 10px",
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
                disabled={loading}
                style={{
                  marginTop: 18,
                  width: "100%",
                  borderRadius: 999,
                  padding: "10px 16px",
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                  color: "#e0f2fe",
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Sending magic link…" : "Send Login Link →"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 30 }}>
            <h2>Check your email</h2>
            <p>
              We sent a secure login link to <b>{form.email}</b>.
              <br />
              Click it to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const label = {
  fontSize: 11,
  color: "#9ca3af",
  marginBottom: 4,
  display: "block",
};

const field = {
  width: "100%",
  borderRadius: 999,
  padding: "9px 12px",
  border: "1px solid rgba(51,65,85,0.9)",
  background: "rgba(15,23,42,0.96)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
};
