// pages/auth/callback.js — SSO Auth Landing (Cinematic)
import { useEffect, useState } from "react";

export default function AuthCallback() {
  const [status, setStatus] = useState("Authenticating…");

  useEffect(() => {
    setTimeout(() => {
      // TODO: verify token + redirect
      setStatus("Redirecting you to your cockpit…");
    }, 800);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#e5e7eb",
        fontSize: 18,
      }}
    >
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow:
            "0 20px 45px rgba(15,23,42,0.96),0 0 26px rgba(56,189,248,0.25)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 26, marginBottom: 12 }}>🔄</div>
        <div>{status}</div>
      </div>
    </div>
  );
}
