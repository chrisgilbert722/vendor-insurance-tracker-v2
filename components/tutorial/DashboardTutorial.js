// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight (stable) + Cinematic Buttons + Step 5 top

import { useEffect, useState } from "react";

const STEPS = [
  {
    id: "risk",
    title: "Global Compliance Score",
    body: `This shows your live, AI-driven compliance health across all vendors.
If this drops, something is wrong.`,
  },
  {
    id: "fixPlans",
    title: "AI Fix Plans & KPIs",
    body: `These KPIs summarize expired policies, upcoming expirations, and AI rule failures.
They tell you what to fix first.`,
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps",
    body: `This is your Alerts Intelligence layer (timelines, types, aging, SLA, watchlist, heat).
This is where risk becomes visible.`,
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body: `Upcoming renewals and expiration backlog live here so nothing slips through the cracks.`,
  },
  {
    id: "vendors",
    title: "Vendor Policy Cockpit",
    body: `Every vendor is scored, explained, and traceable in one place.
Click any row for full details.`,
  },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  const anchorRef = anchors?.[step.id];
  const isTopStep = step.id === "vendors";

  // Auto-scroll highlighted section into view
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

  // Track highlight rectangle
  useEffect(() => {
    if (!anchorRef?.current || typeof window === "undefined") {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const box = anchorRef.current.getBoundingClientRect();
      setRect({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    };

    updateRect();
    window.addEventListener("scroll", updateRect, { passive: true });
    window.addEventListener("resize", updateRect);

    return () => {
      window.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, [anchorRef, stepIndex]);

  const handleNext = () => {
    if (atLast) return onFinish?.();
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const handleBack = () => setStepIndex((i) => Math.max(i - 1, 0));
  const handleSkip = () => onFinish?.();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        // IMPORTANT: overlay should NOT steal clicks except the card
        pointerEvents: "none",
      }}
    >
      {/* DIM LAYER */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.60)",
          backdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}
      />

      {/* HIGHLIGHT BOX */}
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - 10,
            left: rect.left - 10,
            width: rect.width + 20,
            height: rect.height + 20,
            borderRadius: step.id === "risk" ? 22 : 18,
            border: "2px solid rgba(56,189,248,0.95)",
            boxShadow:
              "0 0 28px rgba(56,189,248,0.85), 0 0 60px rgba(59,130,246,0.55)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* TUTORIAL CARD */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          top: isTopStep ? 22 : "auto",
          bottom: isTopStep ? "auto" : 28,
          width: "min(560px, calc(100vw - 24px))",
          borderRadius: 22,
          padding: 18,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 18px 55px rgba(0,0,0,0.82), 0 0 40px rgba(56,189,248,0.22)",
          color: "#e5e7eb",
          pointerEvents: "auto", // ONLY card should be clickable
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            padding: "3px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.35)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0.65))",
            marginBottom: 10,
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

        <h2
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 18,
            fontWeight: 650,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {step.title}
        </h2>

        <p
          style={{
            margin: 0,
            marginBottom: 14,
            fontSize: 13,
            color: "#cbd5f5",
            whiteSpace: "pre-line",
            lineHeight: 1.55,
          }}
        >
          {step.body.trim()}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Skip
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleBack}
              disabled={atFirst}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(71,85,105,0.9)",
                background: atFirst
                  ? "rgba(15,23,42,0.65)"
                  : "rgba(15,23,42,0.95)",
                color: atFirst ? "#6b7280" : "#e5e7eb",
                fontSize: 12,
                fontWeight: 600,
                cursor: atFirst ? "not-allowed" : "pointer",
                opacity: atFirst ? 0.65 : 1,
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
                fontWeight: 700,
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
    </div>
  );
}
