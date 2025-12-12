// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight V5 (Stable, Cinematic, Non-Breaking)

import { useEffect, useLayoutEffect, useState } from "react";

/* ============================================================
   TOUR STEPS
============================================================ */
const STEPS = [
  {
    id: "risk",
    title: "Global Compliance Score",
    body:
      "This is your real-time compliance health across all vendors. " +
      "If this drops, something needs immediate attention.",
  },
  {
    id: "fixPlans",
    title: "AI Fix Plans & KPIs",
    body:
      "These KPIs show expired COIs, upcoming expirations, and failed rules. " +
      "This is where you start every day.",
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps",
    body:
      "All missing coverage, low limits, and rule failures appear here. " +
      "This section shows exactly which vendors are causing risk.",
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body:
      "Upcoming renewals and backlog live here. " +
      "This replaces spreadsheets and manual tracking.",
  },
  {
    id: "vendors",
    title: "Vendor Policy Cockpit",
    body:
      "Every vendor is scored and explained in one place. " +
      "Click any vendor to see full AI analysis.",
  },
];

/* ============================================================
   COMPONENT
============================================================ */
export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];
  const isLast = stepIndex === STEPS.length - 1;

  /* ============================================================
     STEP 3 — FORCE ALERTS PANEL OPEN (SAFE)
  ============================================================ */
  useEffect(() => {
    if (step.id !== "alerts") return;
    window.dispatchEvent(new CustomEvent("dashboard_open_alerts"));
  }, [step.id]);

  /* ============================================================
     SCROLL TARGET INTO VIEW
  ============================================================ */
  useEffect(() => {
    if (!anchorRef?.current) return;
    anchorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [stepIndex, anchorRef]);

  /* ============================================================
     MEASURE HIGHLIGHT RECT
  ============================================================ */
  useLayoutEffect(() => {
    if (!anchorRef?.current) {
      setRect(null);
      return;
    }

    const measure = () => {
      const box = anchorRef.current.getBoundingClientRect();
      setRect({
        top: Math.max(box.top - 12, 12),
        left: Math.max(box.left - 12, 12),
        width: box.width + 24,
        height: box.height + 24,
      });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [anchorRef, stepIndex]);

  if (!rect) return null;

  const placeTooltipAbove =
    rect.top + rect.height + 260 > window.innerHeight;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {/* DIM BACKDROP (NO BLUR, DOES NOT OBSCURE CONTENT) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.35)",
        }}
      />

      {/* HIGHLIGHT FRAME */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 18,
          border: "2px solid rgba(56,189,248,0.95)",
          boxShadow:
            "0 0 40px rgba(56,189,248,0.85), inset 0 0 20px rgba(56,189,248,0.25)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          top: placeTooltipAbove
            ? rect.top - 220
            : rect.top + rect.height + 18,
          left: Math.min(
            Math.max(24, rect.left),
            window.innerWidth - 560
          ),
          maxWidth: 520,
          borderRadius: 20,
          padding: 18,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 18px 50px rgba(0,0,0,0.85), 0 0 30px rgba(56,189,248,0.25)",
          color: "#e5e7eb",
          pointerEvents: "auto",
        }}
      >
        {/* STEP COUNT */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          Step {stepIndex + 1} / {STEPS.length}
        </div>

        {/* TITLE */}
        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 600,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {step.title}
        </h3>

        {/* BODY */}
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.5,
            color: "#cbd5f5",
          }}
        >
          {step.body}
        </p>

        {/* CONTROLS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <button
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0}
            style={{
              background: "transparent",
              border: "none",
              color: stepIndex === 0 ? "#6b7280" : "#9ca3af",
              cursor: stepIndex === 0 ? "default" : "pointer",
              fontSize: 13,
            }}
          >
            ← Back
          </button>

          <button
            onClick={() =>
              isLast ? onFinish() : setStepIndex((i) => i + 1)
            }
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.9)",
              background: isLast
                ? "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)"
                : "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: isLast
                ? "0 0 20px rgba(34,197,94,0.6)"
                : "0 0 20px rgba(59,130,246,0.6)",
            }}
          >
            {isLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
