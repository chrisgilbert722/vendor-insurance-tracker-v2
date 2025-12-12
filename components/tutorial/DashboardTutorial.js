// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4 (FIXED, production-safe)

import { useEffect, useState } from "react";

const STEPS = [
  { id: "risk", title: "Global Compliance Score", body: "This is your real-time compliance health across all vendors." },
  { id: "fixPlans", title: "AI Fix Plans & KPIs", body: "These KPIs tell you exactly what needs attention first." },
  { id: "alerts", title: "Alerts & Coverage Gaps", body: "All missing coverage and rule failures appear here." },
  { id: "renewals", title: "Renewals & Expirations", body: "Upcoming renewals and backlog live here." },
  { id: "vendors", title: "Vendor Policy Cockpit", body: "Every vendor is scored and explained in one place." },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];

  /* ============================================================
     FORCE ALERTS OPEN BEFORE STEP 3 MEASURES
  ============================================================ */
  useEffect(() => {
    if (step.id !== "alerts") return;

    const btn =
      document.querySelector("button[aria-label='Alerts']") ||
      document.querySelector("button[data-alerts-toggle]");

    if (btn) {
      btn.click();
    }
  }, [step.id]);

  /* ============================================================
     WAIT FOR DOM TO EXIST (CRITICAL FIX)
  ============================================================ */
  useEffect(() => {
    if (!anchorRef) return;

    let attempts = 0;

    const tryLocate = () => {
      if (!anchorRef.current) {
        attempts++;
        if (attempts < 20) {
          requestAnimationFrame(tryLocate);
        }
        return;
      }

      const b = anchorRef.current.getBoundingClientRect();
      setRect({
        top: b.top - 12,
        left: b.left - 12,
        width: b.width + 24,
        height: b.height + 24,
      });

      anchorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    };

    tryLocate();
  }, [stepIndex, anchorRef]);

  if (!rect) return null;

  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* DARK MASK */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.7)",
          WebkitMaskImage: `radial-gradient(circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent ${Math.max(rect.width, rect.height) / 2}px, black ${Math.max(rect.width, rect.height)}px)`,
          maskImage: `radial-gradient(circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent ${Math.max(rect.width, rect.height) / 2}px, black ${Math.max(rect.width, rect.height)}px)`,
        }}
      />

      {/* HIGHLIGHT */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 18,
          border: "2px solid #38bdf8",
          boxShadow: "0 0 40px rgba(56,189,248,0.9)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP (AUTO POSITION) */}
      <div
        style={{
          position: "fixed",
          top:
            step.id === "vendors"
              ? rect.top - 160
              : rect.top + rect.height + 20,
          left: Math.max(24, rect.left),
          maxWidth: 420,
          background: "rgba(15,23,42,0.98)",
          borderRadius: 16,
          padding: 16,
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          color: "#e5e7eb",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "#9ca3af" }}>
          DASHBOARD TOUR {stepIndex + 1}/{STEPS.length}
        </div>

        <h3 style={{ margin: "6px 0", color: "#38bdf8" }}>{step.title}</h3>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>{step.body}</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <button
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            disabled={stepIndex === 0}
          >
            Back
          </button>

          <button
            onClick={() =>
              isLast ? onFinish() : setStepIndex((i) => i + 1)
            }
          >
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
