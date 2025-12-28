// components/alerts/FixActionCard.js
// =======================================
// FIX ACTION CARD — ATTEMPTS REAL ACTION
// Enforces TRIAL_LOCKED server response
// Adds trial countdown urgency (UI only)
// =======================================

import { useState, useMemo } from "react";

export default function FixActionCard({
  vendorId,
  orgId,
  subject,
  body,
  trialEndsAt,
}) {
  const [loading, setLoading] = useState(false);
  const [trialLocked, setTrialLocked] = useState(false);
  const [error, setError] = useState("");

  // ---- Trial countdown (UI only, safe) ----
  const daysLeft = useMemo(() => {
    if (!trialEndsAt) return null;
    const end =
      typeof trialEndsAt === "string"
        ? new Date(trialEndsAt)
        : trialEndsAt;
    const diffMs = end.getTime() - Date.now();
    const d = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Number.isFinite(d) ? Math.max(d, 0) : null;
  }, [trialEndsAt]);

  async function handleSend() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/vendor/send-fix-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          orgId,
          subject,
          body,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        if (json.code === "TRIAL_LOCKED") {
          setTrialLocked(true);
          return;
        }
        throw new Error(json.error || "Failed to send");
      }

      // Paid path later
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
        border: "1px solid rgba(51,65,85,0.8)",
        background: "rgba(2,6,23,0.9)",
      }}
    >
      <button
        onClick={handleSend}
        disabled={loading || trialLocked}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 999,
          background: trialLocked
            ? "rgba(51,65,85,0.8)"
            : "#2563eb",
          color: trialLocked ? "#9ca3af" : "#fff",
          fontWeight: 600,
          cursor: trialLocked ? "not-allowed" : "pointer",
        }}
      >
        {loading
          ? "Sending…"
          : trialLocked
          ? "Automation Locked"
          : "Send Vendor Email"}
      </button>

      {trialLocked && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(37,99,235,0.4)",
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Activate Automation
          </div>

          <div style={{ color: "#9ca3af", marginBottom: 8 }}>
            Automation sends vendor reminders, broker escalations, and renewal
            follow-ups automatically.
          </div>

          {daysLeft !== null && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: daysLeft <= 3 ? "#fbbf24" : "#93c5fd",
              }}
            >
              ⏳ Trial ends in {daysLeft} day{daysLeft === 1 ? "" : "s"}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>
          {error}
        </div>
      )}
    </div>
  );
}
