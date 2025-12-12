// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight V4 (stable, non-breaking)

import { useEffect, useState } from "react";

const STEPS = [
  {
    id: "risk",
    title: "Global Compliance Score",
    body:
      "This shows your live, AI-driven compliance health across all vendors. If this drops, something is wrong.",
  },
  {
    id: "fixPlans",
    title: "AI Fix Plans & KPIs",
    body:
      "These KPIs summarize expirations, warnings, and failures so you know what to fix first.",
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps",
    body:
      "This is your Alerts Intelligence layer: timelines, alert types, aging, SLA breaches, watchlists, and heat signatures.",
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body:
      "Upcoming renewals and backlog live here so nothing slips through the cracks.",
  },
  {
    id: "vendors",
    title: "Vendor Policy Cockpit",
    body:
      "Every vendor is scored, explained, and traceable in one place. Click any row for full details.",
  },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];

  /* ============================================================
     FORCE ALERTS OPEN FOR STEP 3
  ============================================================ */
  useEffect(() => {
    if (step.id !== "alerts") return;

    // Click Alerts toggle safely
    const btn = document.querySelector(
      "button[aria-label='Alerts'], button:has-text('Alerts')"
    );
    if (btn) btn.click();
  }, [step.id]);

  /* ============================================================
     WAIT FOR ANCHOR TO EXIST (NO DISAPPEARING)
  ============================================================ */
  useEffect(() => {
    if (!anchorRef?.current) return;

    const updateRect = () => {
      const b = anchorRef.current.getBoundingClientRect();
      setRect({
        top: b.top - 10,
        left: b.left - 10,
        width: b.width + 20,
        height: b.height + 20,
      });
    };

    updateRect();

    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, [anchorRef, stepIndex]);

  /* ============================================================
     AUTO SCROLL INTO VIEW
  ============================================================ */
  useEffect(() => {
    if (!anchorRef?.current) return;
    anchorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [stepIndex, anchorRef]);

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  const next = () =>
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  /* ============================================================
     RENDER (DO NOT UNMOUNT IF rect IS NULL)
  ============================================================ */
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* DIM OVERLAY (NO BLUR ON TARGET) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.65)",
          pointerEvents: "none",
        }}
      />

      {/* HIGHLIGHT */}
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 18,
            border: "2px solid #38bdf8",
            boxShadow:
              "0 0 35px rgba(56,189,248,0.9), inset 0 0 0 9999px rgba(0,0,0,0)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: 520,
          width: "calc(100% - 32px)",
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          borderRadius: 18,
          padding: 18,
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow:
            "0 18px 45px rgba(0,0,0,0.85), 0 0 35px rgba(56,189,248,0.25)",
          color: "#e5e7eb",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          DASHBOARD TOUR {stepIndex + 1}/{STEPS.length}
        </div>

        <h3
          style={{
            margin: "0 0 6px",
            fontSize: 18,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {step.title}
        </h3>

        <p style={{ fontSize: 13, lineHeight: 1.5, color: "#cbd5f5" }}>
          {step.body}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
          }}
        >
          <button
            onClick={back}
            disabled={atFirst}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(71,85,105,0.8)",
              color: atFirst ? "#6b7280" : "#e5e7eb",
              cursor: atFirst ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>

          <button
            onClick={atLast ? onFinish : next}
            style={{
              padding: "7px 18px",
              borderRadius: 999,
              background: atLast
                ? "linear-gradient(90deg,#22c55e,#16a34a)"
                : "linear-gradient(90deg,#3b82f6,#1d4ed8)",
              border: "none",
              color: "#ecfeff",
              fontWeight: 600,
              boxShadow: "0 0 18px rgba(56,189,248,0.55)",
              cursor: "pointer",
            }}
          >
            {atLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

