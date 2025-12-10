// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial Overlay — Cinematic First-Run Experience

import { useState } from "react";

const TUTORIAL_STEPS = [
  {
    id: "risk",
    title: "Your Compliance Risk Score is Live",
    body: `
This is your organization's live compliance pulse. AI updates this score automatically
as vendors upload COIs, rules run, and fix plans are applied. Use it as your single
glance view of overall risk.`,
  },
  {
    id: "fix-plans",
    title: "AI Fix Plans Ready to Send",
    body: `
Fix Cockpit has already analyzed vendor gaps and drafted fix plans and email language.
You don't start from a blank page — you just review and send. This alone saves hours
of manual chasing and writing.`,
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps Mapped for You",
    body: `
Every missing coverage, low limit, expired policy, or endorsement issue is surfaced as
an alert. You can sort by severity, vendor, or coverage type to decide what to tackle first.`,
  },
  {
    id: "renewals",
    title: "Renewal Intelligence is Turned On",
    body: `
The system tracks expirations and upcoming renewals so you don't live in a spreadsheet.
Use the renewal views to see what’s at risk in the next 30, 60, or 90 days — before
it becomes a fire drill.`,
  },
  {
    id: "vendors",
    title: "Your Vendors Are Now in One Cockpit",
    body: `
Every onboarded vendor now has a profile, policies, risk summary, fix plan, and alerts
in a single place. Drill in with one click, or manage them in bulk from this dashboard.
You're ready to run this like a modern compliance operation.`,
  },
];

export default function DashboardTutorial({ onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);

  const step = TUTORIAL_STEPS[stepIndex];
  const totalSteps = TUTORIAL_STEPS.length;
  const atFirst = stepIndex === 0;
  const atLast = stepIndex === totalSteps - 1;

  function handleNext() {
    if (atLast) {
      if (typeof onFinish === "function") onFinish();
      return;
    }
    setStepIndex((idx) => Math.min(idx + 1, totalSteps - 1));
  }

  function handleBack() {
    setStepIndex((idx) => Math.max(idx - 1, 0));
  }

  function handleSkip() {
    if (typeof onFinish === "function") onFinish();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15,23,42,0.88)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      {/* Ambient Glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 65%)",
          filter: "blur(120px)",
          zIndex: -1,
        }}
      />

      {/* Center Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 24,
          padding: 24,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow: `
            0 0 50px rgba(15,23,42,0.95),
            0 0 80px rgba(15,23,42,0.9),
            inset 0 0 20px rgba(15,23,42,0.9)
          `,
          color: "#e5e7eb",
        }}
      >
        {/* Header Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.5)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.6))",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#9ca3af",
            }}
          >
            Dashboard Tour
          </span>
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#38bdf8",
            }}
          >
            First Run
          </span>
        </div>

        {/* Title + Progress */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {step.title}
            </h2>
            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                lineHeight: 1.5,
                color: "#9ca3af",
                whiteSpace: "pre-line",
              }}
            >
              {step.body.trim()}
            </p>
          </div>

          {/* Step indicator */}
          <div
            style={{
              textAlign: "right",
              fontSize: 11,
              color: "#9ca3af",
              minWidth: 80,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "#e5e7eb",
              }}
            >
              {stepIndex + 1}
              <span
                style={{
                  fontSize: 14,
                  color: "#64748b",
                  marginLeft: 2,
                }}
              >
                /{totalSteps}
              </span>
            </div>
            <div style={{ marginTop: 2 }}>steps</div>
          </div>
        </div>

        {/* Fake highlight hint / caption */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            border: "1px dashed rgba(148,163,184,0.5)",
            background: "rgba(15,23,42,0.9)",
            fontSize: 12,
            color: "#a5b4fc",
          }}
        >
          Tip: Look for the glowing panels on the dashboard — risk, fix plans,
          alerts, and renewals are all live and already running. This tour is
          just showing you where the engines you just configured are working.
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
          }}
        >
          {/* Left side: Skip */}
          <button
            type="button"
            onClick={handleSkip}
            style={{
              border: "none",
              background: "transparent",
              color: "#9ca3af",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Skip tutorial
          </button>

          {/* Right side: Back / Next */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleBack}
              disabled={atFirst}
              style={{
                padding: "8px 14px",
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
                padding: "8px 18px",
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
              {atLast ? "Finish →" : "Next step →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
