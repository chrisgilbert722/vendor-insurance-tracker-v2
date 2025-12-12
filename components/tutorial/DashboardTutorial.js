// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight V5 (Stable, Non-Blurring, Cinematic)

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

  /* ---------------------------------------------------------
     WAIT UNTIL ANCHOR EXISTS (CRITICAL FIX)
  --------------------------------------------------------- */
  useEffect(() => {
    if (!anchorRef) return;

    let tries = 0;
    const maxTries = 20;

    const waitForAnchor = () => {
      if (anchorRef.current) {
        updateRect();
        scrollToAnchor();
        return;
      }
      tries++;
      if (tries < maxTries) {
        requestAnimationFrame(waitForAnchor);
      }
    };

    const updateRect = () => {
      const box = anchorRef.current.getBoundingClientRect();
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    };

    const scrollToAnchor = () => {
      const box = anchorRef.current.getBoundingClientRect();
      const y =
        box.top + window.scrollY - window.innerHeight * 0.3;
      window.scrollTo({ top: y < 0 ? 0 : y, behavior: "smooth" });
    };

    waitForAnchor();
  }, [stepIndex, anchorRef]);

  if (!rect) return null;

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  /* ---------------------------------------------------------
     OVERLAY PANELS (NO BLUR ON TARGET)
  --------------------------------------------------------- */
  const overlayStyle = {
    position: "fixed",
    background: "rgba(2,6,23,0.72)",
    zIndex: 99998,
    pointerEvents: "none",
  };

  const panels = [
    { top: 0, left: 0, width: "100%", height: rect.top },
    {
      top: rect.top,
      left: 0,
      width: rect.left,
      height: rect.height,
    },
    {
      top: rect.top,
      left: rect.left + rect.width,
      width: "100%",
      height: rect.height,
    },
    {
      top: rect.top + rect.height,
      left: 0,
      width: "100%",
      height: "100%",
    },
  ];

  /* ---------------------------------------------------------
     TOOLTIP POSITION
  --------------------------------------------------------- */
  const tooltipTop = atLast
    ? 24
    : rect.top + rect.height + 24;

  return (
    <>
      {panels.map((p, i) => (
        <div key={i} style={{ ...overlayStyle, ...p }} />
      ))}

      {/* Highlight Border */}
      <div
        style={{
          position: "fixed",
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          borderRadius: 20,
          border: "2px solid #38bdf8",
          boxShadow:
            "0 0 30px rgba(56,189,248,0.9)",
          zIndex: 99999,
          pointerEvents: "none",
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          top: tooltipTop,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: 520,
          padding: 20,
          borderRadius: 20,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.8)",
          color: "#e5e7eb",
          zIndex: 100000,
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
            margin: "4px 0 8px",
            color: "#38bdf8",
            fontSize: 18,
          }}
        >
          {step.title}
        </h3>

        <p style={{ fontSize: 14, lineHeight: 1.5 }}>
          {step.body}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            gap: 12,
          }}
        >
          <button
            onClick={() => setStepIndex(i => Math.max(0, i - 1))}
            disabled={atFirst}
            style={buttonStyle(atFirst, "secondary")}
          >
            ← Back
          </button>

          <button
            onClick={() =>
              atLast
                ? onFinish?.()
                : setStepIndex(i => i + 1)
            }
            style={buttonStyle(false, atLast ? "success" : "primary")}
          >
            {atLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------
   BUTTON STYLES
--------------------------------------------------------- */
function buttonStyle(disabled, variant) {
  const base = {
    padding: "8px 18px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "1px solid transparent",
  };

  if (variant === "secondary") {
    return {
      ...base,
      background: "rgba(15,23,42,0.9)",
      border: "1px solid rgba(71,85,105,0.8)",
      color: disabled ? "#6b7280" : "#e5e7eb",
    };
  }

  if (variant === "success") {
    return {
      ...base,
      background:
        "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
      color: "#dcfce7",
      boxShadow: "0 0 20px rgba(34,197,94,0.6)",
    };
  }

  return {
    ...base,
    background:
      "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
    color: "#e0f2fe",
    boxShadow: "0 0 20px rgba(59,130,246,0.6)",
  };
}
