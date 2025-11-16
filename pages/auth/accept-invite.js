// pages/auth/accept-invite.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    }
    init();
  }, []);

  useEffect(() => {
    if (!token) return;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/org/validate-invite?token=${token}`);
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error);
        setInvite(data.invite);
      } catch (err) {
        console.error("Validate invite error:", err);
        setError(err.message || "Failed to validate invite.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleAccept() {
    if (!session) {
      setError("You must be logged in to accept an invite.");
      return;
    }

    setAccepting(true);
    setError("");

    try {
      const res = await fetch("/api/org/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userId: session.user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      // Optionally set org cookie is handled by org/switch on dashboard load
      router.push("/dashboard");
    } catch (err) {
      console.error("Accept invite error:", err);
      setError(err.message || "Failed to accept invite.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
          background: "#0f172a",
          borderRadius: "12px",
          border: "1px solid #1f2937",
          padding: "20px 22px",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          Accept Invitation
        </h1>

        {loading ? (
          <p style={{ fontSize: "13px" }}>Checking your invite…</p>
        ) : error ? (
          <p style={{ fontSize: "13px", color: "#fca5a5" }}>⚠ {error}</p>
        ) : !invite ? (
          <p style={{ fontSize: "13px", color: "#9ca3af" }}>
            Invite not found or no longer valid.
          </p>
        ) : (
          <>
            <p style={{ fontSize: "13px", color: "#9ca3af", marginBottom: "8px" }}>
              You’ve been invited to join{" "}
              <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
                {invite.orgName}
              </span>{" "}
              as <strong>{invite.role}</strong>.
            </p>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "12px" }}>
              Invite email:{" "}
              <span style={{ color: "#e5e7eb" }}>{invite.email}</span>
            </p>

            {!session && (
              <p style={{ fontSize: "12px", color: "#f97316" }}>
                You are not logged in.{" "}
                <Link href="/auth/login" style={{ color: "#38bdf8" }}>
                  Log in
                </Link>{" "}
                first, then reopen this invite link.
              </p>
            )}

            {session && (
              <button
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  marginTop: "8px",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  border: "none",
                  background: accepting ? "#6b7280" : "#22c55e",
                  color: "#020617",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: accepting ? "not-allowed" : "pointer",
                }}
              >
                {accepting ? "Accepting…" : "Accept Invite"}
              </button>
            )}
          </>
        )}

        <div style={{ marginTop: "18px", fontSize: "12px", color: "#64748b" }}>
          <Link href="/dashboard" style={{ color: "#38bdf8" }}>
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
