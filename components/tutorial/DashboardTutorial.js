// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight V4 (RECT cutout, stable, cinematic)

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
      "This is your Alerts Intelligence layer: timelines, severities, SLA breaches, and high-risk vendors.",
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

  /* -------------------------------------------------
     FORCE ALERTS OPEN BEFORE STEP 3 MEASURES
  --------------------------------------------------*/
  useEffect(() => {
    if (step.id !== "alerts") return;

    // fire once, async-safe
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("dashboard_force_alerts_open"));
    });
  }, [step.id]);

  /* -------------------------------------------------
     MEASURE TARGET RECT (layout-safe)
  --------------------------------------------------*/
  useLayoutEffect(() => {
    if (!anchorRef?.current) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = anchorRef.current;
      const box = el.getBoundingClientRect();

      setRect({
        top: Math.max(box.top - 12, 8),
        left: Math.max(box.left - 12, 8),
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

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {/* DARK OVERLAY */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.75)",
        }}
      />

      {/* CUTOUT RECT */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          background: "transparent",
          boxShadow: "0 0 0 9999px rgba(2,6,23,0.75)",
          borderRadius: 18,
          pointerEvents: "none",
        }}
      />

      {/* NEON BORDER */}
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
            "0 0 30px rgba(56,189,248,0.9), 0 0 60px rgba(56,189,248,0.6)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 520,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          borderRadius: 20,
          padding: 18,
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(56,189,248,0.25)",
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

        <p
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "#cbd5f5",
            marginBottom: 14,
          }}
        >
          {step.body}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            disabled={atFirst}
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            style={{
              background: "transparent",
              border: "none",
              color: atFirst ? "#6b7280" : "#9ca3af",
              cursor: atFirst ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>

          <button
            onClick={() => {
              if (atLast) onFinish();
              else setStepIndex((i) => i + 1);
            }}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: "1px solid rgba(59,130,246,0.9)",
              background: atLast
                ? "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)"
                : "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: atLast
                ? "0 0 18px rgba(34,197,94,0.6)"
                : "0 0 18px rgba(59,130,246,0.6)",
            }}
          >
            {atLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

