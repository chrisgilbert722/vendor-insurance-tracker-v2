// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4 (stable, cinematic, no reset)

import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
      "This is your Alerts Intelligence layer — timelines, types, aging, SLA breaches, watchlists, and heat.",
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
      "Every vendor is scored, explained, and traceable in one place. Click any row for details.",
  },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const lastRect = useRef(null);
  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];

  // Wait for anchor to exist, DO NOT unmount
  useLayoutEffect(() => {
    if (!anchorRef?.current) return;

    const el = anchorRef.current;
    const box = el.getBoundingClientRect();

    const r = {
      top: Math.max(12, box.top - 10),
      left: Math.max(12, box.left - 10),
      width: box.width + 20,
      height: box.height + 20,
    };

    lastRect.current = r;
    setRect(r);
  }, [stepIndex, anchorRef]);

  // Follow scroll / resize WITHOUT losing state
  useEffect(() => {
    function update() {
      if (!anchorRef?.current) return;
      const box = anchorRef.current.getBoundingClientRect();
      const r = {
        top: Math.max(12, box.top - 10),
        left: Math.max(12, box.left - 10),
        width: box.width + 20,
        height: box.height + 20,
      };
      lastRect.current = r;
      setRect(r);
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef]);

  const activeRect = rect || lastRect.current;
  if (!activeRect) return null;

  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
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

      {/* SPOTLIGHT HOLE */}
      <div
        style={{
          position: "fixed",
          top: activeRect.top,
          left: activeRect.left,
          width: activeRect.width,
          height: activeRect.height,
          borderRadius: 18,
          boxShadow:
            "0 0 0 9999px rgba(2,6,23,0.75), 0 0 45px rgba(56,189,248,0.95)",
          border: "2px solid rgba(56,189,248,1)",
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
          maxWidth: 560,
          background:
            "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
          borderRadius: 20,
          padding: 18,
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.85), 0 0 40px rgba(56,189,248,0.35)",
          color: "#e5e7eb",
          pointerEvents: "auto",
        }}
      >
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
            margin: "4px 0",
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
            lineHeight: 1.55,
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
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0}
            style={{
              background: "transparent",
              border: "1px solid rgba(71,85,105,0.8)",
              color: stepIndex === 0 ? "#64748b" : "#e5e7eb",
              borderRadius: 999,
              padding: "6px 14px",
              cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>

          <button
            onClick={() =>
              isLast ? onFinish?.() : setStepIndex((i) => i + 1)
            }
            style={{
              borderRadius: 999,
              padding: "8px 20px",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              color: "#e0f2fe",
              background: isLast
                ? "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)"
                : "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              boxShadow: "0 0 18px rgba(59,130,246,0.6)",
            }}
          >
            {isLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

