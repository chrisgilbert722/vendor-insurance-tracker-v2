// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — TRUE Spotlight V4 (cutout mask, cinematic) — FIXED

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
      "These KPIs show what needs attention first: expirations, warnings, and failures.",
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps",
    body:
      "Your full alerts intelligence layer. This is where missing coverage and rule failures surface.",
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body:
      "Upcoming renewals and backlog live here, so you never miss a window.",
  },
  {
    id: "vendors",
    title: "Vendor Policy Cockpit",
    body:
      "Every vendor is listed with scoring and flags. Click any row to open the full vendor drawer.",
  },
];

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];

  const cardRef = useRef(null);
  const [cardH, setCardH] = useState(160);

  // measure tooltip height so we can place it above/below safely
  useEffect(() => {
    const t = setTimeout(() => {
      if (cardRef.current) {
        const b = cardRef.current.getBoundingClientRect();
        if (b.height) setCardH(b.height);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [stepIndex]);

  // IMPORTANT FIX:
  // reset rect immediately on step change, then wait until the new anchor exists and measure it
  useEffect(() => {
    if (typeof window === "undefined") return;

    setRect(null); // <- THIS is what prevents Step 3 from reusing Step 2’s highlight

    let cancelled = false;
    let attempts = 0;

    const locateAndMeasure = () => {
      if (cancelled) return;

      const el = anchorRef?.current;
      if (!el) {
        attempts++;
        if (attempts < 40) requestAnimationFrame(locateAndMeasure);
        return;
      }

      const b = el.getBoundingClientRect();

      const pad = step.id === "risk" ? 12 : 10;
      const nextRect = {
        top: b.top - pad,
        left: b.left - pad,
        width: b.width + pad * 2,
        height: b.height + pad * 2,
      };

      setRect(nextRect);

      // scroll AFTER we have a real rect
      const centerY =
        b.top + window.scrollY - window.innerHeight / 2 + b.height / 2;

      window.scrollTo({
        top: Math.max(0, centerY),
        behavior: "smooth",
      });
    };

    locateAndMeasure();

    return () => {
      cancelled = true;
    };
  }, [stepIndex, anchorRef, step.id]);

  // keep rect updated on scroll/resize AFTER it exists
  useEffect(() => {
    if (!rect || typeof window === "undefined") return;
    if (!anchorRef?.current) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const b = el.getBoundingClientRect();

      const pad = step.id === "risk" ? 12 : 10;
      setRect({
        top: b.top - pad,
        left: b.left - pad,
        width: b.width + pad * 2,
        height: b.height + pad * 2,
      });
    };

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [rect, anchorRef, step.id]);

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === STEPS.length - 1;

  const next = () => {
    if (atLast) return onFinish?.();
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  if (!rect) return null;

  // tooltip positioning (clamped)
  const margin = 16;
  const preferBelow = rect.top + rect.height + 18;
  const preferAbove = rect.top - cardH - 18;

  let tooltipTop;
  if (step.id === "vendors") {
    // Step 5 must be top
    tooltipTop = 24;
  } else if (preferBelow + cardH <= window.innerHeight - margin) {
    tooltipTop = preferBelow;
  } else {
    tooltipTop = Math.max(margin, preferAbove);
  }

  const tooltipLeft = Math.min(
    Math.max(margin, rect.left),
    window.innerWidth - margin - 520
  );

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const hole = Math.max(rect.width, rect.height) / 2;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* DARK MASK WITH CUTOUT */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2,6,23,0.72)",
          WebkitMaskImage: `radial-gradient(circle at ${cx}px ${cy}px, transparent ${hole}px, black ${hole + 140}px)`,
          maskImage: `radial-gradient(circle at ${cx}px ${cy}px, transparent ${hole}px, black ${hole + 140}px)`,
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
            "0 0 35px rgba(56,189,248,0.95), 0 0 60px rgba(59,130,246,0.55)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div
        ref={cardRef}
        style={{
          position: "fixed",
          top: tooltipTop,
          left: tooltipLeft,
          width: "min(520px, calc(100vw - 32px))",
          borderRadius: 20,
          padding: 18,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 18px 45px rgba(0,0,0,0.8), 0 0 40px rgba(56,189,248,0.25)",
          color: "#e5e7eb",
          pointerEvents: "auto",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "3px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.35)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: 10,
          }}
        >
          <span>Dashboard Tour</span>
          <span style={{ color: "#38bdf8" }}>
            {stepIndex + 1}/{STEPS.length}
          </span>
        </div>

        <h3
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
        </h3>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#cbd5f5" }}>
          {step.body}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 14,
          }}
        >
          <button
            type="button"
            onClick={back}
            disabled={atFirst}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid rgba(71,85,105,0.9)",
              background: atFirst ? "rgba(15,23,42,0.7)" : "rgba(15,23,42,0.95)",
              color: atFirst ? "#6b7280" : "#e5e7eb",
              fontSize: 12,
              cursor: atFirst ? "not-allowed" : "pointer",
              opacity: atFirst ? 0.7 : 1,
            }}
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={next}
            style={{
              padding: "7px 16px",
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
  );
}
