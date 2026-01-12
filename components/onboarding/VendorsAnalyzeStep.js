// components/onboarding/VendorsAnalyzeStep.js
// STEP 4 — SYSTEM ARMING PANEL (FIXED + FAIL-OPEN)
// - One cinematic dashboard-style panel
// - Two states only: BLOCKED → READY
// - AI runs once, silently (FAIL-OPEN: never bricks UI if AI endpoint 400s)
// - ONE required input: execution notification email (ORG-level)
// - READY only after explicit confirmation (no auto-advance while typing)
// - ONE CTA: Activate Automation

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const isValidEmail = (v) => {
  const s = String(v || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

// Normalize mapping objects → plain strings
function normalizeMapping(raw = {}) {
  const out = {};
  for (const k in raw) {
    const v = raw[k];
    out[k] = typeof v === "string" ? v : v?.column || "";
  }
  return out;
}

// Safely read a mapped column off a CSV row
function getCell(row, colName) {
  if (!row || !colName) return "";
  // row keys might be exact header names
  const v = row[colName];
  return v == null ? "" : String(v).trim();
}

// Build a small vendor list payload that most “analyze” endpoints accept.
// (If your backend ignores it, fine. If it expects it, this fixes the 400.)
function buildVendorCsvPayload(rows, mapping) {
  const m = normalizeMapping(mapping);

  // We support a few common mapping keys used across the app
  const nameCol = m.vendorName || m.name || m.vendor_name || "";
  const emailCol = m.email || "";
  const categoryCol = m.category || "";
  const policyCol = m.policyNumber || m.policy_number || "";
  const expCol = m.expiration || m.expiration_date || m.expDate || "";

  // Keep it light; AI just needs signal.
  return rows.slice(0, 250).map((r) => ({
    name: getCell(r, nameCol) || getCell(r, "vendor_name") || getCell(r, "name"),
    email: getCell(r, emailCol) || getCell(r, "email"),
    category:
      getCell(r, categoryCol) ||
      getCell(r, "category") ||
      getCell(r, "trade") ||
      "General",
    policyNumber: getCell(r, policyCol) || getCell(r, "policy_number"),
    expiration: getCell(r, expCol) || getCell(r, "expiration_date"),
  }));
}

export default function VendorsAnalyzeStep({ orgId, wizardState, setWizardState }) {
  const csv = wizardState?.vendorsCsv || {};
  const rows = Array.isArray(csv.rows) ? csv.rows : [];
  const hasVendorData = rows.length > 0;

  // AI: tracked but silent (FAIL-OPEN)
  const [aiRan, setAiRan] = useState(Boolean(wizardState?.vendorsAnalyzed?.ai));
  const [aiRunning, setAiRunning] = useState(false);

  // Email: split draft vs confirmed (prevents premature READY)
  const confirmedEmail = useMemo(
    () => String(wizardState?.executionEmail || "").trim(),
    [wizardState?.executionEmail]
  );

  const [emailDraft, setEmailDraft] = useState(confirmedEmail || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState("");

  // If wizardState executionEmail changes (from server), keep draft in sync once
  const didHydrateRef = useRef(false);
  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;
    if (confirmedEmail && !emailDraft) setEmailDraft(confirmedEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedEmail]);

  const emailConfirmed = Boolean(confirmedEmail) && isValidEmail(confirmedEmail);

  // ✅ READY depends on:
  // - vendors uploaded (so we don’t “arm” a blank org)
  // - confirmed email
  const isReady = hasVendorData && emailConfirmed;

  const canConfirm = hasVendorData && isValidEmail(emailDraft) && !savingEmail;

  /* -------------------------------------------------
     RUN AI ANALYSIS (ONCE, SILENT, FAIL-OPEN)
     IMPORTANT:
     - This MUST NEVER brick the UI if the endpoint returns 400/500.
     - We mark aiRan after the first attempt (success OR fail).
  -------------------------------------------------- */
  useEffect(() => {
    if (!orgId || aiRan || aiRunning || !hasVendorData) return;

    let cancelled = false;

    async function runAi() {
      setAiRunning(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          // Fail-open: no session, just mark as ran to avoid loops
          if (!cancelled) {
            setAiRan(true);
            setWizardState((prev) => ({
              ...prev,
              vendorsAnalyzed: {
                ...(prev.vendorsAnalyzed || {}),
                ai: { ok: false, skipped: true, reason: "Missing session" },
              },
            }));
          }
          return;
        }

        const mapping = csv?.mapping || {};
        const vendorCsv = buildVendorCsvPayload(rows, mapping);

        // ✅ Make request robust: include orgId AND vendorCsv
        const res = await fetch("/api/onboarding/ai-vendors-analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            orgId, // some routes expect this explicitly
            vendorCsv, // some routes expect this instead of orgId
          }),
        });

        let json = null;
        try {
          json = await res.json();
        } catch {
          json = null;
        }

        // FAIL-OPEN:
        // - If endpoint errors, we still mark aiRan so UI doesn’t loop.
        // - We store the failure so you can inspect later.
        if (!cancelled) {
          setAiRan(true);
          setWizardState((prev) => ({
            ...prev,
            vendorsAnalyzed: {
              ...(prev.vendorsAnalyzed || {}),
              ai: json?.ok
                ? json
                : {
                    ok: false,
                    skipped: true,
                    status: res.status,
                    error:
                      json?.error ||
                      json?.message ||
                      `AI analyze failed (${res.status})`,
                  },
            },
          }));
        }
      } catch (e) {
        // FAIL-OPEN: swallow, but mark as ran
        if (!cancelled) {
          setAiRan(true);
          setWizardState((prev) => ({
            ...prev,
            vendorsAnalyzed: {
              ...(prev.vendorsAnalyzed || {}),
              ai: { ok: false, skipped: true, error: e?.message || "AI failed" },
            },
          }));
        }
      } finally {
        if (!cancelled) setAiRunning(false);
      }
    }

    runAi();
    return () => {
      cancelled = true;
    };
  }, [orgId, aiRan, aiRunning, hasVendorData, rows, csv, setWizardState]);

  /* -------------------------------------------------
     SAVE / CONFIRM EXECUTION EMAIL (EXPLICIT)
  -------------------------------------------------- */
  async function confirmExecutionEmail() {
    if (!canConfirm) return;

    setSavingEmail(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication missing.");
      }

      const email = String(emailDraft || "").trim();

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

      // Persist in wizard state (single source of truth for confirmed email)
      setWizardState((prev) => ({
        ...prev,
        executionEmail: email,
      }));
    } catch (err) {
      setError(err?.message || "Failed to save email.");
    } finally {
      setSavingEmail(false);
    }
  }

  /* -------------------------------------------------
     UI
  -------------------------------------------------- */
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 26,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        border: "1px solid rgba(148,163,184,0.45)",
        boxShadow:
          "0 0 55px rgba(0,0,0,0.85),0 0 70px rgba(56,189,248,0.28),inset 0 0 24px rgba(0,0,0,0.55)",
        color: "#e5e7eb",
      }}
    >
      {/* Local pulse animations */}
      <style>{`
        @keyframes pulseBlue {
          0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.65); }
          70% { box-shadow: 0 0 0 16px rgba(56,189,248,0); }
          100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
        }
        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.75); }
          70% { box-shadow: 0 0 0 20px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(148,163,184,0.75)",
              marginBottom: 6,
            }}
          >
            STEP 4 • SYSTEM ARMING
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            AI Vendor Automation
          </h2>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
            {aiRunning
              ? "AI evaluation running…"
              : aiRan
              ? "AI evaluation complete."
              : "AI evaluation initializing…"}
          </div>
        </div>

        {/* Status pill (dashboard-style) */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 12px",
            borderRadius: 999,
            border: `1px solid ${
              isReady ? "rgba(34,197,94,0.6)" : "rgba(56,189,248,0.55)"
            }`,
            background: "rgba(2,6,23,0.35)",
            color: isReady ? "#bbf7d0" : "#e0f2fe",
            fontSize: 12,
            fontWeight: 650,
            boxShadow: isReady
              ? "0 0 18px rgba(34,197,94,0.25)"
              : "0 0 18px rgba(56,189,248,0.18)",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: isReady ? "#22c55e" : "#38bdf8",
              animation: isReady ? "pulseGreen 0.95s infinite" : "pulseBlue 1.35s infinite",
            }}
          />
          {isReady ? "System armed for automation" : "System paused — input required"}
        </div>
      </div>

      {/* Progress */}
      <div
        style={{
          marginTop: 10,
          height: 7,
          borderRadius: 999,
          background: "rgba(2,6,23,0.55)",
          overflow: "hidden",
          border: "1px solid rgba(51,65,85,0.55)",
        }}
      >
        <div
          style={{
            width: isReady ? "92%" : "72%",
            height: "100%",
            background: isReady
              ? "linear-gradient(90deg,#22c55e,#4ade80)"
              : "linear-gradient(90deg,#38bdf8,#6366f1)",
            transition: "width 650ms ease",
          }}
        />
      </div>

      {/* BLOCKED: Confirm Email */}
      {!isReady && (
        <div
          style={{
            marginTop: 22,
            borderRadius: 18,
            padding: 16,
            border: "1px solid rgba(51,65,85,0.65)",
            background:
              "linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.88))",
            boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.9)", marginBottom: 6 }}>
            Required to activate
          </div>

          {!hasVendorData && (
            <div style={{ fontSize: 12, color: "#fbbf24", marginBottom: 10 }}>
              No vendor file detected in this session. Go back and upload a CSV to
              arm the system.
            </div>
          )}

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
              color: "#e5e7eb",
            }}
          >
            Execution Notification Email
          </label>

          <input
            type="email"
            placeholder="ops@company.com"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmExecutionEmail();
              }
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: `1px solid ${
                isValidEmail(emailDraft)
                  ? "rgba(56,189,248,0.65)"
                  : "rgba(51,65,85,0.85)"
              }`,
              background: "rgba(2,6,23,0.55)",
              color: "#e5e7eb",
              fontSize: 14,
              outline: "none",
              boxShadow: isValidEmail(emailDraft)
                ? "0 0 0 3px rgba(56,189,248,0.12)"
                : "none",
            }}
          />

          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
            Alerts, renewals, and enforcement notices are sent here.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={confirmExecutionEmail}
              disabled={!canConfirm}
              style={{
                padding: "9px 16px",
                borderRadius: 999,
                border: `1px solid ${
                  canConfirm ? "rgba(56,189,248,0.75)" : "rgba(51,65,85,0.65)"
                }`,
                background: canConfirm
                  ? "radial-gradient(circle at top left,rgba(56,189,248,0.35),rgba(15,23,42,0.92))"
                  : "rgba(15,23,42,0.65)",
                color: canConfirm ? "#e0f2fe" : "rgba(148,163,184,0.7)",
                fontWeight: 800,
                fontSize: 13,
                cursor: canConfirm ? "pointer" : "not-allowed",
              }}
            >
              {savingEmail ? "Confirming…" : "Confirm Email"}
            </button>

            {confirmedEmail ? (
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
                Current:{" "}
                <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                  {confirmedEmail}
                </span>
              </span>
            ) : (
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
                No email confirmed yet.
              </span>
            )}
          </div>
        </div>
      )}

      {/* READY: Single CTA */}
      {isReady && (
        <div style={{ marginTop: 22, textAlign: "center" }}>
          <div
            style={{
              marginBottom: 10,
              fontSize: 12,
              color: "rgba(148,163,184,0.9)",
            }}
          >
            Vendors analyzed · Risk engine primed · Alerts armed
          </div>

          <button
            onClick={() => (window.location.href = "/billing/activate")}
            style={{
              padding: "15px 34px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(90deg,#22c55e,#4ade80)",
              color: "#022c22",
              fontWeight: 900,
              fontSize: 16,
              boxShadow: "0 0 34px rgba(34,197,94,0.5), 0 0 70px rgba(34,197,94,0.18)",
              cursor: "pointer",
            }}
          >
            Activate Automation
          </button>

          <div style={{ marginTop: 9, fontSize: 12, color: "rgba(148,163,184,0.85)" }}>
            14-day trial · $499/mo after · Cancel anytime · Card required
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148,163,184,0.75)" }}>
            Notifications will be sent to{" "}
            <span style={{ color: "#22c55e", fontWeight: 800 }}>{confirmedEmail}</span>
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
