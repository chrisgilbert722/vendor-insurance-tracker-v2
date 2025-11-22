// pages/auth/accept-invite.js — Cockpit V10 Invite Acceptance
import { useState } from "react";
import Link from "next/link";

export default function AcceptInvitePage() {
  const [email, setEmail] = useState("");
  const [invitedBy] = useState("Admin User"); // mock until wired
  const [orgName] = useState("Your Organization"); // mock
  const [role] = useState("Manager"); // mock role from token
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password.trim() || !confirm.trim()) {
      setError("Enter and confirm your password.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // TODO: redirect once wired
    }, 800);
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
      {/* Ambient Glow */}
      <div
        style={{
          position: "absolute",
          top: -240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 480,
          borderRadius: 24,
          padding: 24,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.98),0 0 40px rgba(56,189,248,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#38bdf8,#6366f1,#0f172a)",
              boxShadow: "0 0 30px rgba(56,189,248,0.6)",
            }}
          >
            <span style={{ fontSize: 22 }}>📨</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 6,
                padding: "3px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                }}
              >
                Accept Invite
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Join your organization
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              Join{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {orgName}
              </span>
            </h1>

            <p
              style={{
                fontSize: 13,
                color: "#cbd5f5",
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              You were invited as a{" "}
              <span style={{ color: "#e0f2fe" }}>{role}</span> by{" "}
              <span style={{ color: "#e0f2fe" }}>{invitedBy}</span>.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              display: "block",
            }}
          >
            Email (must match invite)
          </label>
          <input
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
              outline: "none",
              marginBottom: 12,
            }}
          />

          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              display: "block",
            }}
          >
            Set Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "8px 11px",
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 13,
              outline: "none",
              marginBottom: 10,
            }}
          />

          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              display: "block",
            }}
          >
            Confirm Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "8px 11px",
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 13,
              outline: "none",
              marginBottom: 10,
            }}
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
            disabled={loading}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "9px 14px",
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontSize: 13,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            {loading ? "Creating account…" : "Join Organization"}
          </button>
        </form>

        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          <Link href="/auth/login" style={{ color: "#93c5fd" }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
