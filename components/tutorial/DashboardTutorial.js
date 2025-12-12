// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4 (stable, cinematic, step-safe)

import { useEffect, useLayoutEffect, useState } from "react";

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
      "All missing coverage, low limits, and rule failures appear here. This is where risk becomes visible.",
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

  /* ============================================================
     FORCE ALERTS OPEN (STEP 3 SAFE)
  ============================================================ */
  useEffect(() => {
    if (step.id !== "alerts") return;

    // Give dashboard time to mount alerts DOM
    const t = setTimeout(() => {
      const btn = document.querySelector(
        "button[aria-label='Alerts'], button[data-alert-toggle]"
      );
      if (btn) btn.click();
    }, 0);

    return () => clearTimeout(t);
  }, [step.id]);

  /* ============================================================
     SCROLL INTO VIEW
  ============================================================ */
  useEffect(() => {
    if (!anchorRef?.current) return;

    anchorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [stepIndex, anchorRef]);

  /* ============================================================
     TRACK RECT (layout-safe)
  ============================================================ */
  useLayoutEffect(() => {
    if (!anchorRef?.current) {
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

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  const next = () =>
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* DIM LAYER */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.72)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* CUTOUT + BORDER */}
      {rect && (
        <>
          <div
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: 18,
              boxShadow:
                "0 0 0 9999px rgba(2,6,23,0.72), 0 0 40px rgba(56,189,248,0.9)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              borderRadius: 18,
              border: "2px solid #38bdf8",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          top: rect ? rect.top + rect.height + 20 : "50%",
          left: rect ? Math.max(24, rect.left) : "50%",
          transform: rect ? "none" : "translate(-50%, -50%)",
          maxWidth: 460,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          borderRadius: 20,
          padding: 18,
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.85), 0 0 40px rgba(56,189,248,0.35)",
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          Dashboard Tour {stepIndex + 1}/{STEPS.length}
        </div>

        <h3
          style={{
            margin: "4px 0 8px",
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

        {/* CONTROLS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={back}
            disabled={atFirst}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(71,85,105,0.9)",
              background: atFirst
                ? "rgba(15,23,42,0.6)"
                : "rgba(15,23,42,0.95)",
              color: atFirst ? "#6b7280" : "#e5e7eb",
              cursor: atFirst ? "not-allowed" : "pointer",
            }}
          >
            ← Back
          </button>

          <button
            onClick={atLast ? onFinish : next}
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
                ? "0 0 18px rgba(34,197,94,0.55)"
                : "0 0 18px rgba(59,130,246,0.55)",
            }}
          >
            {atLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
