// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4.1 (stable, no disappearing steps)

import { useEffect, useRef, useState } from "react";

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

  // We KEEP last known rect so tutorial never disappears
  const [rect, setRect] = useState(null);
  const lastRectRef = useRef(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];

  /* ---------------------------------------------------------
     STEP 3: FORCE ALERTS OPEN (SAFE, DELAYED)
  --------------------------------------------------------- */
  useEffect(() => {
    if (step.id !== "alerts") return;

    // Delay one frame so React finishes rendering
    const id = requestAnimationFrame(() => {
      const btn = document.querySelector(
        "button[aria-label='Alerts'], button[data-alert-toggle]"
      );
      if (btn) btn.click();
    });

    return () => cancelAnimationFrame(id);
  }, [step.id]);

  /* ---------------------------------------------------------
     AUTO SCROLL INTO VIEW
  --------------------------------------------------------- */
  useEffect(() => {
    if (!anchorRef?.current) return;

    anchorRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [stepIndex, anchorRef]);

  /* ---------------------------------------------------------
     TRACK RECT (STABLE)
  --------------------------------------------------------- */
  useEffect(() => {
    if (!anchorRef?.current) {
      // Keep last rect instead of killing tutorial
      setRect(lastRectRef.current);
      return;
    }

    const update = () => {
      const box = anchorRef.current.getBoundingClientRect();
      const r = {
        top: box.top - 12,
        left: box.left - 12,
        width: box.width + 24,
        height: box.height + 24,
      };

      lastRectRef.current = r;
      setRect(r);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, stepIndex]);

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */
  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  const next = () => {
    if (atLast) {
      onFinish?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const back = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  if (!rect) return null;

  /* ---------------------------------------------------------
     TOOLTIP POSITIONING (FIX STEP 5)
  --------------------------------------------------------- */
  const tooltipTop =
    rect.top + rect.height + 20 > window.innerHeight - 220
      ? rect.top - 180
      : rect.top + rect.height + 20;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* DARK MASK */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.7)",
          WebkitMaskImage: `radial-gradient(circle at ${
            rect.left + rect.width / 2
          }px ${rect.top + rect.height / 2}px,
            transparent ${Math.max(rect.width, rect.height) / 2}px,
            black ${Math.max(rect.width, rect.height)}px)`,
          maskImage: `radial-gradient(circle at ${
            rect.left + rect.width / 2
          }px ${rect.top + rect.height / 2}px,
            transparent ${Math.max(rect.width, rect.height) / 2}px,
            black ${Math.max(rect.width, rect.height)}px)`,
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
          top: tooltipTop,
          left: Math.max(24, rect.left),
          maxWidth: 440,
          background: "rgba(15,23,42,0.98)",
          borderRadius: 16,
          padding: 16,
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "#9ca3af",
          }}
        >
          DASHBOARD TOUR {stepIndex + 1}/{STEPS.length}
        </div>

        <h3 style={{ margin: "6px 0", color: "#38bdf8" }}>
          {step.title}
        </h3>

        <p style={{ fontSize: 13, lineHeight: 1.5 }}>
          {step.body}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <button onClick={back} disabled={atFirst}>
            Back
          </button>

          <button onClick={next}>
            {atLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
