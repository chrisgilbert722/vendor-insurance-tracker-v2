// pages/auth/verify.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function VerifyPage() {
  const router = useRouter();
  const email =
    typeof router.query.email === "string" ? router.query.email : "";
  const redirect =
    typeof router.query.redirect === "string"
      ? router.query.redirect
      : "/dashboard";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");

    if (!email || code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    try {
      setLoading(true);

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email", // email OTP
      });

      if (verifyError) {
        console.error("[verify] verifyOtp error:", verifyError);
        setError(verifyError.message || "Invalid or expired code.");
        return;
      }

      // Session is now active; redirect to desired page
      router.replace(redirect);
    } catch (err) {
      console.error("[verify] unexpected error:", err);
      setError("Could not verify code. Please try again.");
    } finally {
      setLoading(false);
    }
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
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.4), transparent 60%)",
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
          maxWidth: 420,
          borderRadius: 24,
          padding: 20,
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.6)",
          boxShadow:
            "0 24px 60px rgba(15,23,42,0.98),0 0 40px rgba(56,189,248,0.25)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          Enter your 6-digit code
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "#9ca3af" }}>
          We sent a login code to{" "}
          <span style={{ color: "#e5e7eb" }}>{email || "your email"}</span>.
        </p>

        <form onSubmit={handleVerify} style={{ marginTop: 14 }}>
          <label
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
              display: "block",
            }}
          >
            6-digit code
          </label>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "8px 11px",
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 16,
              letterSpacing: 6,
              textAlign: "center",
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
            disabled={loading || code.length !== 6}
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
              cursor:
                loading || code.length !== 6 ? "not-allowed" : "pointer",
              opacity: loading || code.length !== 6 ? 0.6 : 1,
            }}
          >
            {loading ? "Verifying…" : "Verify and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
