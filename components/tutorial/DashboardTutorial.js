// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight, lighter dimming, auto-scroll

import { useEffect, useState } from "react";

const STEPS = [
  {
    id: "risk",
    title: "Your Global Compliance Score",
    body: `
This shows your live, AI-driven compliance score across all vendors and policies.
If this goes down, something is wrong.`,
  },
  {
    id: "fixPlans",
    title: "AI Fix Plans & KPIs",
    body: `
These KPIs summarize expired COIs, upcoming expirations, and Elite Engine fails.
They tell you where to look first each day.`,
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps",
    body: `
All missing coverage, low limits, and rule failures show here.
Use this to see which vendors are causing immediate risk.`,
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body: `
This panel shows upcoming policy expirations and renewal backlog.
It replaces spreadsheets and manual follow-up lists.`,
  },
  {
    id: "vendors",
    title: "Vendor Policy Cockpit",
    body: `
Every vendor with COIs is listed here with AI scoring, rule results, and flags.
Click any row to open the full vendor drawer.`,
  },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  const anchorRef = anchors?.[step.id];

  // Auto-scroll the highlighted section into view when step changes
  useEffect(() => {
    if (!anchorRef?.current || typeof window === "undefined") return;

    const el = anchorRef.current;
    const box = el.getBoundingClientRect();
    const scrollY =
      box.top + window.scrollY - window.innerHeight / 2 + box.height / 2;

    window.scrollTo({
      top: scrollY < 0 ? 0 : scrollY,
      behavior: "smooth",
    });
  }, [stepIndex, anchorRef]);

  // Track highlight rectangle for current anchor
  useEffect(() => {
    if (!anchorRef?.current || typeof window === "undefined") {
      setRect(null);
      return;
    }

    function updateRect() {
      const box = anchorRef.current.getBoundingClientRect();
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    }

    updateRect();

    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, [anchorRef, stepIndex]);

  const handleNext = () => {
    if (atLast) {
      if (typeof onFinish === "function") onFinish();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSkip = () => {
    if (typeof onFinish === "function") onFinish();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        // Lighter dim — you can still see the dashboard
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(4px)",
        pointerEvents: "none",
      }}
    >
      {/* Highlight box */}
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: 16,
            border: "2px solid rgba(56,189,248,0.95)",
            boxShadow:
              "0 0 25px rgba(56,189,248,0.85), 0 0 40px rgba(59,130,246,0.7)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tutorial Card — bottom center, always visible */}
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 560,
          borderRadius: 20,
          padding: 18,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 16px 45px rgba(0,0,0,0.75), 0 0 40px rgba(56,189,248,0.25)",
          color: "#e5e7eb",
          pointerEvents: "auto",
          fontFamily: "system-ui",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            padding: "3px 9px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.4)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))",
            marginBottom: 8,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9ca3af",
          }}
        >
          <span>Dashboard Tour</span>
          <span style={{ color: "#38bdf8" }}>
            {stepIndex + 1}/{STEPS.length}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            margin: 0,
            marginBottom: 6,
            fontSize: 18,
            fontWeight: 600,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {step.title}
        </h2>

        {/* Body */}
        <p
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 13,
            color: "#cbd5f5",
            whiteSpace: "pre-line",
            lineHeight: 1.5,
          }}
        >
          {step.body.trim()}
        </p>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Skip tutorial
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleBack}
              disabled={atFirst}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                border: "1px solid rgba(71,85,105,0.9)",
                background: atFirst
                  ? "rgba(15,23,42,0.7)"
                  : "rgba(15,23,42,0.95)",
                color: atFirst ? "#6b7280" : "#e5e7eb",
                fontSize: 12,
                cursor: atFirst ? "not-allowed" : "pointer",
                opacity: atFirst ? 0.6 : 1,
              }}
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                border: "1px solid rgba(59,130,246,0.9)",
                background: atLast
                  ? "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)"
                  : "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                color: "#e0f2fe",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: atLast
                  ? "0 0 18px rgba(34,197,94,0.55)"
                  : "0 0 18px rgba(59,130,246,0.55)",
              }}
            >
              {atLast ? "Finish →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
