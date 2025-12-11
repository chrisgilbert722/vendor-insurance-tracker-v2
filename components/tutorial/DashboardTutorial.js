// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4 (cutout mask, cinematic)

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

  // FORCE ALERTS OPEN ON STEP 3
  useEffect(() => {
    if (step.id === "alerts") {
      const btn = document.querySelector("button[aria-label='Alerts']");
      if (btn) btn.click();
    }
  }, [step.id]);

  // SCROLL INTO VIEW
  useEffect(() => {
    if (!anchorRef?.current) return;
    anchorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [stepIndex]);

  // TRACK RECT
  useEffect(() => {
    if (!anchorRef?.current) return;

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
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* DARK MASK */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.7)",
          maskImage: `radial-gradient(circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent ${Math.max(rect.width, rect.height) / 2}px, black ${Math.max(rect.width, rect.height)}px)`,
          WebkitMaskImage: `radial-gradient(circle at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent ${Math.max(rect.width, rect.height) / 2}px, black ${Math.max(rect.width, rect.height)}px)`,
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
          boxShadow: "0 0 40px rgba(56,189,248,0.9)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          top: rect.top + rect.height + 20,
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
          STEP {stepIndex + 1}/{STEPS.length}
        </div>
        <h3 style={{ margin: "6px 0", color: "#38bdf8" }}>{step.title}</h3>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>{step.body}</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          <button onClick={() => setStepIndex(i => Math.max(i - 1, 0))} disabled={stepIndex === 0}>
            Back
          </button>
          <button onClick={() => stepIndex === STEPS.length - 1 ? onFinish() : setStepIndex(i => i + 1)}>
            {stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
