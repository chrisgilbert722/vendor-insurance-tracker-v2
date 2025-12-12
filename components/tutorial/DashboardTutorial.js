// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4 (cutout mask, cinematic)

import { useEffect, useState } from "react";

const STEPS = [
  {
    id: "risk",
    title: "Global Compliance Score",
    body:
      "This is your real-time compliance health across all vendors. If this drops, something is wrong.",
  },
  {
    id: "fixPlans",
    title: "AI Fix Plans & KPIs",
    body:
      "These KPIs show expired policies, upcoming expirations, and AI rule failures so you know what to fix first.",
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps",
    body:
      "All missing coverage, low limits, and rule failures appear here. This is your highest-risk area.",
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body:
      "Upcoming renewals and backlog live here. This replaces spreadsheets and manual follow-ups.",
  },
  {
    id: "vendors",
    title: "Vendor Policy Cockpit",
    body:
      "Every vendor is scored and explained in one place. Click any row to see full details and fixes.",
  },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];
  const isLastStep = step.id === "vendors";

  /* ============================================================
     AUTO-SCROLL ANCHOR INTO VIEW
============================================================ */
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

  /* ============================================================
     TRACK HIGHLIGHT RECT
============================================================ */
  useEffect(() => {
    if (!anchorRef?.current || typeof window === "undefined") {
      setRect(null);
      return;
    }

    const update = () => {
      const b = anchorRef.current.getBoundingClientRect();
      setRect({
        top: b.top - 12,
        left: b.left - 12,
        width: b.width + 24,
        height: b.height + 24,
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [anchorRef, stepIndex]);

  if (!rect) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {/* DARK MASK WITH CUTOUT */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.7)",
          WebkitMaskImage: `radial-gradient(
            circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px,
            transparent ${Math.max(rect.width, rect.height) / 2}px,
            black ${Math.max(rect.width, rect.height)}px
          )`,
          maskImage: `radial-gradient(
            circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px,
            transparent ${Math.max(rect.width, rect.height) / 2}px,
            black ${Math.max(rect.width, rect.height)}px
          )`,
        }}
      />

      {/* HIGHLIGHT BORDER */}
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
            "0 0 35px rgba(56,189,248,0.9), 0 0 60px rgba(59,130,246,0.6)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP CARD */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: isLastStep ? 24 : rect.top + rect.height + 20,
          bottom: isLastStep ? "auto" : undefined,
          width: "100%",
          maxWidth: 520,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          borderRadius: 20,
          padding: 18,
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 18px 45px rgba(0,0,0,0.8), 0 0 40px rgba(56,189,248,0.25)",
          color: "#e5e7eb",
          pointerEvents: "auto",
          fontFamily: "system-ui",
        }}
      >
        {/* STEP BADGE */}
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

        {/* TITLE */}
        <h3
          style={{
            margin: "6px 0",
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
            fontSize: 13,
            lineHeight: 1.5,
            color: "#cbd5f5",
            marginBottom: 14,
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
          }}
        >
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0}
            style={{
              background: "transparent",
              border: "none",
              color: stepIndex === 0 ? "#6b7280" : "#9ca3af",
              fontSize: 12,
              cursor: stepIndex === 0 ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() =>
              stepIndex === STEPS.length - 1
                ? onFinish?.()
                : setStepIndex((i) => i + 1)
            }
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                stepIndex === STEPS.length - 1
                  ? "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)"
                  : "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow:
                stepIndex === STEPS.length - 1
                  ? "0 0 18px rgba(34,197,94,0.55)"
                  : "0 0 18px rgba(59,130,246,0.55)",
            }}
          >
            {stepIndex === STEPS.length - 1 ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
