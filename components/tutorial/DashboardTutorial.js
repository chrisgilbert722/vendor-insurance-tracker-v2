// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight V5 (Fixed, Deterministic, Cinematic)
// FULL FILE — CLEAN COPY / PASTE
// ✅ Fixes: step progression (1→2→3→4→5) restored
// ✅ Fixes: Finish only runs on last step
// ✅ Fixes: CTA click-blocking (forces overlay to be non-interactive)
// ✅ Telemetry-safe (onEvent optional)
// ✅ Step 3 alert force preserved
// ✅ All spotlight math preserved

import { useEffect, useLayoutEffect, useState } from "react";

const STEPS = [
  {
    id: "risk",
    title: "Global Compliance Score",
    body:
      "This is your real-time compliance health across all vendors. " +
      "If this drops, something needs immediate attention.",
  },
  {
    id: "fixPlans",
    title: "AI Fix Plans & KPIs",
    body:
      "These KPIs show expired COIs, upcoming expirations, and failed rules. " +
      "This is where you start every day.",
  },
  {
    id: "alerts",
    title: "Alerts & Coverage Gaps",
    body:
      "All missing coverage, low limits, and rule failures appear here. " +
      "This section shows exactly which vendors are causing risk.",
  },
  {
    id: "renewals",
    title: "Renewals & Expirations",
    body:
      "Upcoming renewals and backlog live here. " +
      "This replaces spreadsheets and manual tracking.",
  },
  {
    id: "vendors",
    title: "Vendor Policy Cockpit",
    body:
      "Every vendor is scored and explained in one place. " +
      "Click any vendor to see full AI analysis.",
  },
];

export default function DashboardTutorial({ anchors, onFinish, onEvent }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];
  const isLast = stepIndex === STEPS.length - 1;

  /* ============================================================
     TELEMETRY — STEP VIEW
============================================================ */
  useEffect(() => {
    if (typeof onEvent === "function") {
      onEvent("tutorial_step_view", {
        stepId: step.id,
        stepIndex,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  /* ============================================================
     STEP 3 — FORCE ALERTS PANEL OPEN (WAIT UNTIL READY)
============================================================ */
  useEffect(() => {
    if (step.id !== "alerts") return;

    window.dispatchEvent(new Event("dashboard_open_alerts"));

    let tries = 0;
    const waitForAlerts = setInterval(() => {
      if (anchors?.alerts?.current) {
        clearInterval(waitForAlerts);
        measure();
      }
      tries++;
      if (tries > 20) clearInterval(waitForAlerts);
    }, 50);

    return () => clearInterval(waitForAlerts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
     MEASURE HIGHLIGHT RECT
============================================================ */
  const measure = () => {
    if (!anchorRef?.current) {
      setRect(null);
      return;
    }

    const box = anchorRef.current.getBoundingClientRect();
    setRect({
      top: box.top - 12,
      left: box.left - 12,
      width: box.width + 24,
      height: box.height + 24,
    });
  };

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, anchorRef]);

  if (!rect) return null;

  /* ============================================================
     TOOLTIP POSITIONING (FIX STEP 1 WIDTH + LEFT SHIFT)
============================================================ */
  const TOOLTIP_WIDTH = 520;

  const tooltipTop = isLast
    ? Math.max(24, rect.top - 220)
    : rect.top + rect.height + 20;

  const tooltipLeft =
    stepIndex === 0
      ? Math.max(24, rect.left + rect.width - TOOLTIP_WIDTH)
      : Math.max(24, rect.left);

  /* ============================================================
     HANDLERS
============================================================ */
  const goBack = () => {
    if (typeof onEvent === "function") {
      onEvent("tutorial_back", { stepId: step.id, stepIndex });
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const goNextOrFinish = () => {
    if (!isLast) {
      if (typeof onEvent === "function") {
        onEvent("tutorial_next", { stepId: step.id, stepIndex });
      }
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      return;
    }

    if (typeof onEvent === "function") {
      onEvent("tutorial_finish", { stepId: step.id, stepIndex });
    }

    // ✅ critical: unmount tutorial first, then CTA becomes clickable
    setTimeout(() => {
      onFinish();
    }, 0);
  };

  /* ============================================================
     RENDER
============================================================ */
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {/* DARK MASK (force non-interactive so it never blocks CTA) */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              rx="18"
              ry="18"
              fill="black"
            />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="rgba(2,6,23,0.6)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* HIGHLIGHT BORDER */}
      <div
        style={{
          position: "fixed",
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 18,
          border: "2px solid rgba(56,189,248,0.95)",
          boxShadow:
            "0 0 35px rgba(56,189,248,0.85), inset 0 0 18px rgba(56,189,248,0.25)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_WIDTH,
          maxWidth: TOOLTIP_WIDTH,
          borderRadius: 20,
          padding: 18,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow:
            "0 18px 50px rgba(0,0,0,0.85), 0 0 30px rgba(56,189,248,0.25)",
          color: "#e5e7eb",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          Step {stepIndex + 1} / {STEPS.length}
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 18,
            fontWeight: 600,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {step.title}
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.5,
            color: "#cbd5f5",
          }}
        >
          {step.body}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
          }}
        >
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            style={{
              background: "transparent",
              border: "none",
              color: stepIndex === 0 ? "#6b7280" : "#9ca3af",
              cursor: stepIndex === 0 ? "default" : "pointer",
              fontSize: 13,
            }}
          >
            ← Back
          </button>

          <button
            onClick={goNextOrFinish}
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.9)",
              background: isLast
                ? "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)"
                : "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: isLast
                ? "0 0 20px rgba(34,197,94,0.6)"
                : "0 0 20px rgba(59,130,246,0.6)",
            }}
          >
            {isLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
