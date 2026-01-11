// components/onboarding/VendorsAnalyzeStep.js
// STEP 4 — SYSTEM ARMING PANEL (FINAL)
// - One cinematic dashboard-style panel
// - Two states only: BLOCKED → READY
// - AI runs once, silently
// - ONE required input: execution notification email
// - ONE CTA: Activate Automation

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function VendorsAnalyzeStep({ orgId, wizardState, setWizardState }) {
  const csv = wizardState?.vendorsCsv || {};
  const rows = Array.isArray(csv.rows) ? csv.rows : [];

  const [aiRan, setAiRan] = useState(
    Boolean(wizardState?.vendorsAnalyzed?.ai)
  );
  const [email, setEmail] = useState(
    wizardState?.executionEmail || ""
  );
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState("");

  const hasVendorData = rows.length > 0;
  const hasEmail = email && email.includes("@");

  const isReady = hasVendorData && hasEmail;

  /* -------------------------------------------------
     RUN AI ANALYSIS (ONCE, SILENT)
  -------------------------------------------------- */
  useEffect(() => {
    if (!orgId || aiRan || !hasVendorData) return;

    let cancelled = false;

    async function runAi() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) return;

        const res = await fetch("/api/onboarding/ai-vendors-analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orgId }),
        });

        const json = await res.json();
        if (!json?.ok) return;

        if (!cancelled) {
          setAiRan(true);
          setWizardState((prev) => ({
            ...prev,
            vendorsAnalyzed: {
              ...(prev.vendorsAnalyzed || {}),
              ai: json,
            },
          }));
        }
      } catch {
        // silent by design
      }
    }

    runAi();
    return () => {
      cancelled = true;
    };
  }, [orgId, aiRan, hasVendorData, setWizardState]);

  /* -------------------------------------------------
     SAVE EXECUTION EMAIL
  -------------------------------------------------- */
  async function saveExecutionEmail() {
    if (!hasEmail) return;

    setSavingEmail(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication missing.");
      }

      const res = await fetch("/api/onboarding/set-execution-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orgId, email }),
      });

      const json = await res.json();
      if (!json?.ok) throw new Error(json.error || "Failed to save email.");

      setWizardState((prev) => ({
        ...prev,
        executionEmail: email,
      }));
    } catch (err) {
      setError(err.message || "Failed to save email.");
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <div
      style={{
        padding: 26,
        borderRadius: 24,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
        border: "1px solid rgba(148,163,184,0.45)",
        boxShadow:
          "0 0 40px rgba(0,0,0,0.85),0 0 60px rgba(56,189,248,0.25)",
        color: "#e5e7eb",
      }}
    >
      {/* Local pulse animations */}
      <style>{`
        @keyframes pulseBlue {
          0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.7); }
          70% { box-shadow: 0 0 0 14px rgba(56,189,248,0); }
          100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.8); }
          70% { box-shadow: 0 0 0 18px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>

      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(148,163,184,0.7)",
          marginBottom: 6,
        }}
      >
        STEP 4 • SYSTEM ARMING
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
        AI Vendor Automation
      </h2>

      {/* STATUS LINE */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: isReady ? "#22c55e" : "#38bdf8",
            animation: isReady
              ? "pulseGreen 0.9s infinite"
              : "pulseBlue 1.4s infinite",
          }}
        />
        <span style={{ fontSize: 14, color: "#c7d2fe" }}>
          {isReady
            ? "System armed for automation"
            : "System paused — required input missing"}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div
        style={{
          marginTop: 14,
          height: 6,
          borderRadius: 999,
          background: "rgba(15,23,42,0.9)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: isReady ? "90%" : "70%",
            height: "100%",
            background: isReady
              ? "linear-gradient(90deg,#22c55e,#4ade80)"
              : "linear-gradient(90deg,#38bdf8,#6366f1)",
            transition: "width 600ms ease",
          }}
        />
      </div>

      {/* BLOCKER — EXECUTION EMAIL */}
      {!isReady && (
        <div style={{ marginTop: 22 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Execution Notification Email
          </label>

          <input
            type="email"
            placeholder="ops@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 14,
              outline: "none",
            }}
          />

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "rgba(148,163,184,0.8)",
            }}
          >
            Alerts, renewals, and enforcement notices are sent here.
          </div>

          <button
            onClick={saveExecutionEmail}
            disabled={savingEmail || !hasEmail}
            style={{
              marginTop: 14,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.7)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.95),rgba(15,23,42,0.85))",
              color: "#38bdf8",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {savingEmail ? "Saving…" : "Confirm Email"}
          </button>
        </div>
      )}

      {/* READY CTA */}
      {isReady && (
        <div style={{ marginTop: 26, textAlign: "center" }}>
          <button
            onClick={() => (window.location.href = "/billing/activate")}
            style={{
              padding: "14px 30px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(90deg,#22c55e,#4ade80)",
              color: "#022c22",
              fontWeight: 900,
              fontSize: 16,
              boxShadow: "0 0 28px rgba(34,197,94,0.45)",
            }}
          >
            Activate Automation
          </button>

          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
            14-day trial · $499/mo after · Cancel anytime · Card required
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 14, color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}
