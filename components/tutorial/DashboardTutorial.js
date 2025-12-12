// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V5 (stable, cinematic, non-blurring)

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

  /* -------------------------------
     SCROLL + MEASURE (STABLE)
  -------------------------------- */
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
        top: Math.max(b.top - 12, 8),
        left: Math.max(b.left - 12, 8),
        width: Math.min(b.width + 24, window.innerWidth - 16),
        height: Math.min(b.height + 24, window.innerHeight - 16),
      });
    };

    // Measure immediately and again after paint
    measure();
    requestAnimationFrame(measure);

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [stepIndex, anchorRef]);

  if (!rect) return null;

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  /* -------------------------------
     TOOLTIP POSITIONING
  -------------------------------- */
  const showTooltipAbove =
    rect.top + rect.height + 220 > window.innerHeight;

  const tooltipStyle = {
    position: "fixed",
    left: Math.max(24, rect.left),
    maxWidth: 520,
    zIndex: 100002,
    background:
      "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(148,163,184,0.45)",
    boxShadow:
      "0 20px 60px rgba(0,0,0,0.85), 0 0 40px rgba(56,189,248,0.35)",
    color: "#e5e7eb",
    pointerEvents: "auto",
    ...(showTooltipAbove
      ? { top: Math.max(12, rect.top - 220) }
      : { top: rect.top + rect.height + 20 }),
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100000 }}>
      {/* DIM OVERLAY (NO BLUR) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.72)",
          pointerEvents: "none",
        }}
      />

      {/* CLEAR HOLE */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          background: "transparent",
          boxShadow: "0 0 0 9999px rgba(2,6,23,0.72)",
          borderRadius: 18,
          pointerEvents: "none",
        }}
      />

      {/* GLOW BORDER */}
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
            "0 0 35px rgba(56,189,248,0.9), inset 0 0 20px rgba(56,189,248,0.25)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div style={tooltipStyle}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          Dashboard Tour {stepIndex + 1}/{STEPS.length}
        </div>

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

        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: "#cbd5f5",
          }}
        >
          {step.body}
        </p>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={atFirst}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.35)",
              color: atFirst ? "#6b7280" : "#e5e7eb",
              cursor: atFirst ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>

          <button
            onClick={() =>
              atLast ? onFinish?.() : setStepIndex((i) => i + 1)
            }
            style={{
              padding: "8px 20px",
              borderRadius: 999,
              background: atLast
                ? "linear-gradient(90deg,#22c55e,#16a34a)"
                : "linear-gradient(90deg,#3b82f6,#2563eb)",
              border: "none",
              color: "#e5e7eb",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                "0 0 18px rgba(59,130,246,0.55)",
            }}
          >
            {atLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
