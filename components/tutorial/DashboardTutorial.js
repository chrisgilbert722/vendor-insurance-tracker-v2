// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4 (stable, cinematic, no blur bugs)

import { useEffect, useLayoutEffect, useState } from "react";

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
      "This is your Alerts Intelligence layer — timelines, types, aging, SLA breaches, watchlists, and heat. This is where risk becomes visible.",
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body:
      "Upcoming renewals and expiration backlog live here so nothing slips through the cracks.",
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

  /* -------------------------------------------------------
     FORCE ALERTS OPEN FOR STEP 3 (CRITICAL FIX)
  ------------------------------------------------------- */
  useEffect(() => {
    if (step.id !== "alerts") return;

    // Dispatch event your dashboard already listens to
    window.dispatchEvent(new CustomEvent("dashboard_force_open_alerts"));
  }, [step.id]);

  /* -------------------------------------------------------
     WAIT FOR ANCHOR, THEN MEASURE + SCROLL
  ------------------------------------------------------- */
  useLayoutEffect(() => {
    if (!anchorRef?.current) return;

    const el = anchorRef.current;

    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const measure = () => {
      const b = el.getBoundingClientRect();
      setRect({
        top: b.top,
        left: b.left,
        width: b.width,
        height: b.height,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [stepIndex, anchorRef]);

  if (!rect) return null;

  const next = () => {
    if (stepIndex === STEPS.length - 1) {
      onFinish?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  /* -------------------------------------------------------
     TRUE SPOTLIGHT OVERLAY (NO BLUR ON TARGET)
  ------------------------------------------------------- */
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* TOP */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: rect.top,
          background: "rgba(2,6,23,0.72)",
        }}
      />
      {/* LEFT */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: 0,
          width: rect.left,
          height: rect.height,
          background: "rgba(2,6,23,0.72)",
        }}
      />
      {/* RIGHT */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left + rect.width,
          right: 0,
          height: rect.height,
          background: "rgba(2,6,23,0.72)",
        }}
      />
      {/* BOTTOM */}
      <div
        style={{
          position: "fixed",
          top: rect.top + rect.height,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(2,6,23,0.72)",
        }}
      />

      {/* HIGHLIGHT */}
      <div
        style={{
          position: "fixed",
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderRadius: 18,
          border: "2px solid #38bdf8",
          boxShadow: "0 0 45px rgba(56,189,248,0.9)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          top: rect.top + rect.height + 18,
          left: Math.max(24, rect.left),
          maxWidth: 480,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          borderRadius: 18,
          padding: 18,
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow:
            "0 18px 55px rgba(0,0,0,0.85),0 0 40px rgba(56,189,248,0.35)",
          color: "#e5e7eb",
          zIndex: 100000,
          pointerEvents: "auto",
        }}
      >
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
          DASHBOARD TOUR {stepIndex + 1}/{STEPS.length}
        </div>

        <h3 style={{ margin: "0 0 6px", color: "#38bdf8" }}>
          {step.title}
        </h3>

        <p style={{ fontSize: 13, lineHeight: 1.5 }}>{step.body}</p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 14,
          }}
        >
          <button
            onClick={back}
            disabled={stepIndex === 0}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(15,23,42,0.85)",
              color: "#cbd5f5",
              cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>

          <button
            onClick={next}
            style={{
              padding: "6px 18px",
              borderRadius: 999,
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                stepIndex === STEPS.length - 1
                  ? "radial-gradient(circle at top left,#22c55e,#16a34a)"
                  : "radial-gradient(circle at top left,#3b82f6,#1d4ed8)",
              color: "#ecfeff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {stepIndex === STEPS.length - 1 ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
