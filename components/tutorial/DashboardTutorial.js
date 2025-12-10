// components/tutorial/DashboardTutorial.js
// ============================================================
// CINEMATIC DASHBOARD TUTORIAL V3
// Full spotlight engine + arrows + fade + smooth motion
// Compatible with dashboard.js anchors: risk, fixPlans, alerts, renewals, vendors
// ============================================================

import React, { useEffect, useState, useRef } from "react";

// ---- STEP DEFINITIONS -------------------------------------------------------
const STEPS = [
  {
    id: "risk",
    title: "Your Global Compliance Risk Score",
    body: `
AI continuously evaluates every vendor, policy, expiration, and rule.
This score updates LIVE — it's the single fastest way to see your compliance health.`,
  },
  {
    id: "fixPlans",
    title: "AI Fix Plans Are Already Running",
    body: `
Fix Cockpit built fix plans and email drafts for vendors with missing coverage,
expired COIs, or low limits. You can send them instantly.`,
  },
  {
    id: "alerts",
    title: "Coverage Issues & Alerts",
    body: `
All missing policies, low limits, expired certificates, and rule failures show here.
This is your day-to-day mission panel.`,
  },
  {
    id: "renewals",
    title: "Renewal Intelligence Activated",
    body: `
AI predicts upcoming expirations, overdue renewals, and renewal risk.
This replaces spreadsheets and manual reminders.`,
  },
  {
    id: "vendors",
    title: "Your Full Vendor Cockpit",
    body: `
Every vendor now has a profile, policies, alerts, fix plan, and rule analysis.
Drill into any vendor with one click.`,
  },
];

// ---- LERP UTILITY -----------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;

// ---- MAIN COMPONENT ---------------------------------------------------------
export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spot, setSpot] = useState(null); // final animated rect

  const activeStep = STEPS[stepIndex];
  const activeAnchor = anchors[activeStep.id];

  const anim = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const target = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // ---- GET DOM RECT ---------------------------------------------------------
  function computeRect() {
    if (!activeAnchor?.current) return null;
    const r = activeAnchor.current.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  // ---- UPDATE TARGET WHEN STEP CHANGES --------------------------------------
  useEffect(() => {
    const rect = computeRect();
    if (rect) {
      target.current = rect;
    }
  }, [stepIndex, activeAnchor]);

  // ---- SMOOTH ANIMATION LOOP ------------------------------------------------
  useEffect(() => {
    let frame;
    function update() {
      anim.current.x = lerp(anim.current.x, target.current.x, 0.14);
      anim.current.y = lerp(anim.current.y, target.current.y, 0.14);
      anim.current.w = lerp(anim.current.w, target.current.w, 0.14);
      anim.current.h = lerp(anim.current.h, target.current.h, 0.14);

      setSpot({ ...anim.current });
      frame = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(frame);
  }, []);

  // ---- RECALCULATE RECT ON RESIZE / SCROLL ---------------------------------
  useEffect(() => {
    if (!activeAnchor?.current) return;

    function refresh() {
      const rect = computeRect();
      if (rect) target.current = rect;
    }

    refresh();

    const obs = new ResizeObserver(refresh);
    obs.observe(activeAnchor.current);

    window.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, [activeAnchor]);

  if (!spot) return null;

  // ---- CONTROL HANDLERS -----------------------------------------------------
  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  const next = () => {
    if (atLast) return finish();
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));
  const skip = () => finish();

  const finish = () => {
    if (typeof onFinish === "function") onFinish();
  };

  // ---- SPOTLIGHT VISUAL DIMENSIONS ------------------------------------------
  const padding = 12;
  const ringX = spot.x - padding;
  const ringY = spot.y - padding;
  const ringW = spot.w + padding * 2;
  const ringH = spot.h + padding * 2;
  const centerX = ringX + ringW / 2;

  return (
    <>
      {/* DARK BACKDROP */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.68)",
          backdropFilter: "blur(3px)",
          zIndex: 99998,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()} // prevent closing
      />

      {/* SPOTLIGHT HOLE */}
      <div
        style={{
          position: "fixed",
          left: ringX,
          top: ringY,
          width: ringW,
          height: ringH,
          borderRadius: 18,
          zIndex: 99999,
          boxShadow: `
            0 0 0 9999px rgba(0,0,0,0.72),
            0 0 32px rgba(56,189,248,0.45),
            0 0 46px rgba(148,163,184,0.35)
          `,
          transition: "box-shadow 0.35s ease",
          pointerEvents: "none",
        }}
      />

      {/* SIDECARD: TITLE + BODY + CONTROLS */}
      <div
        style={{
          position: "fixed",
          top: ringY + ringH / 2 - 120,
          left: Math.min(centerX + ringW / 2 + 40, window.innerWidth - 380),
          width: 340,
          padding: 24,
          borderRadius: 18,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
          border: "1px solid rgba(148,163,184,0.35)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
          zIndex: 100000,
          color: "#e5e7eb",
        }}
      >
        {/* Header Badge */}
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            padding: "3px 9px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.3)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0.55))",
            marginBottom: 10,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#9ca3af",
          }}
        >
          Dashboard Tour
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 20,
            margin: 0,
            marginBottom: 6,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {activeStep.title}
        </h2>

        {/* Body */}
        <p
          style={{
            whiteSpace: "pre-line",
            fontSize: 13,
            color: "#cbd5f5",
            marginBottom: 18,
            lineHeight: "1.5",
          }}
        >
          {activeStep.body}
        </p>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          {/* Skip */}
          <button
            onClick={skip}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Skip
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {/* Back */}
            <button
              disabled={atFirst}
              onClick={back}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(71,85,105,0.8)",
                background: atFirst
                  ? "rgba(15,23,42,0.6)"
                  : "rgba(15,23,42,0.95)",
                color: atFirst ? "#6b7280" : "#e5e7eb",
                cursor: atFirst ? "not-allowed" : "pointer",
                fontSize: 12,
              }}
            >
              ← Back
            </button>

            {/* Next */}
            <button
              onClick={next}
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
                  : "0 0 18px rgba(59,130,246,0.45)",
              }}
            >
              {atLast ? "Finish →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
