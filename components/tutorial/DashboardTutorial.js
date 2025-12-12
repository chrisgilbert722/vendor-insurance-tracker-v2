// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Stable Cinematic Spotlight (NO BLUR, NO MASK)

import { useEffect, useState } from "react";

const STEPS = [
  { id: "risk", title: "Global Compliance Score", body: "This shows your live, AI-driven compliance health across all vendors. If this drops, something is wrong." },
  { id: "fixPlans", title: "AI Fix Plans & KPIs", body: "These KPIs summarize expirations, warnings, and failures so you know what to fix first." },
  { id: "alerts", title: "Alerts & Coverage Gaps", body: "This is your Alerts Intelligence layer — timelines, types, aging, SLA breaches, watchlists, and heat." },
  { id: "renewals", title: "Renewals & Expirations", body: "Upcoming renewals and backlog live here so nothing slips through the cracks." },
  { id: "vendors", title: "Vendor Policy Cockpit", body: "Every vendor is scored, explained, and traceable in one place. Click any row for details." },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];

  // Auto-scroll to anchor
  useEffect(() => {
    if (!anchorRef?.current) return;
    anchorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [stepIndex, anchorRef]);

  if (!anchorRef?.current) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(2,6,23,0.55)", // DIM ONLY — NO BLUR
        pointerEvents: "none",
      }}
    >
      {/* Highlight Frame */}
      <div
        style={{
          position: "absolute",
          top: anchorRef.current.getBoundingClientRect().top - 8,
          left: anchorRef.current.getBoundingClientRect().left - 8,
          width: anchorRef.current.getBoundingClientRect().width + 16,
          height: anchorRef.current.getBoundingClientRect().height + 16,
          borderRadius: 20,
          border: "2px solid #38bdf8",
          boxShadow: "0 0 40px rgba(56,189,248,0.9)",
          pointerEvents: "none",
        }}
      />

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          bottom: step.id === "vendors" ? "auto" : 32,
          top: step.id === "vendors" ? 24 : "auto",
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: 520,
          padding: 18,
          borderRadius: 18,
          background: "rgba(15,23,42,0.98)",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow: "0 18px 50px rgba(0,0,0,0.8)",
          color: "#e5e7eb",
          pointerEvents: "auto",
        }}
      >
        <div style={{ fontSize: 11, color: "#9ca3af", letterSpacing: "0.14em" }}>
          DASHBOARD TOUR {stepIndex + 1}/{STEPS.length}
        </div>

        <h3 style={{ margin: "6px 0", color: "#38bdf8" }}>{step.title}</h3>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>{step.body}</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
          <button
            onClick={() => setStepIndex(i => Math.max(i - 1, 0))}
            disabled={stepIndex === 0}
            style={navBtn(false)}
          >
            ← Back
          </button>

          <button
            onClick={() =>
              stepIndex === STEPS.length - 1
                ? onFinish()
                : setStepIndex(i => i + 1)
            }
            style={navBtn(true)}
          >
            {stepIndex === STEPS.length - 1 ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function navBtn(primary) {
  return {
    padding: "8px 18px",
    borderRadius: 999,
    border: primary ? "1px solid #38bdf8" : "1px solid rgba(148,163,184,0.4)",
    background: primary
      ? "linear-gradient(90deg,#3b82f6,#2563eb)"
      : "rgba(15,23,42,0.8)",
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: primary ? "0 0 18px rgba(59,130,246,0.6)" : "none",
  };
}
