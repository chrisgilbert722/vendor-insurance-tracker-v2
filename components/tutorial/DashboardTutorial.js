// components/tutorial/DashboardTutorial.js
// Dashboard Tutorial — Spotlight V5 (Polished, Stable, Deterministic)

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

export default function DashboardTutorial({ anchors, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);

  const step = STEPS[stepIndex];
  const anchorRef = anchors?.[step.id];
  const isLast = stepIndex === STEPS.length - 1;

  /* ============================================================
     LOCK SCROLL DURING TUTORIAL (POLISH)
  ============================================================ */
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  /* ============================================================
     STEP 3 — FORCE ALERTS PANEL OPEN (SAFE)
  ============================================================ */
  useEffect(() => {
    if (step.id !== "alerts") return;

    window.dispatchEvent(new Event("dashboard_open_alerts"));

    let tries = 0;
    const wait = setInterval(() => {
      if (anchors?.alerts?.current) {
        clearInterval(wait);
        measure();
      }
      if (++tries > 20) clearInterval(wait);
    }, 50);

    return () => clearInterval(wait);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id]);

  /* ============================================================
     SCROLL INTO VIEW
  ============================================================ */
  useEffect(() => {
    if (!anchorRef?.current) return;
    anchorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [stepIndex, anchorRef]);

  /* ============================================================
     MEASURE RECT (STABLE)
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

  const tooltipTop = isLast
    ? Math.max(24, rect.top - 220)
    : rect.top + rect.height + 20;

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
        animation: "fadeIn 220ms ease-out",
      }}
    >
      {/* SPOTLIGHT MASK */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "fixed", inset: 0 }}
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
          fill="rgba(2,6,23,0.55)"
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
          border: "2px solid rgba(56,189,248,0.85)",
          boxShadow:
            "0 0 22px rgba(56,189,248,0.6), inset 0 0 12px rgba(56,189,248,0.18)",
          pointerEvents: "none",
        }}
      />

      {/* TOOLTIP */}
      <div
        style={{
          position: "fixed",
          top: tooltipTop,
          left: Math.max(24, Math.min(rect.left, window.innerWidth - 560)),
          maxWidth: 520,
          borderRadius: 20,
          padding: 18,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow:
            "0 14px 40px rgba(0,0,0,0.8), 0 0 20px rgba(56,189,248,0.2)",
          color: "#e5e7eb",
          pointerEvents: "auto",
          animation: "fadeUp 240ms ease-out",
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
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
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
            onClick={() =>
              isLast ? onFinish() : setStepIndex((i) => i + 1)
            }
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
                ? "0 0 14px rgba(34,197,94,0.5)"
                : "0 0 14px rgba(59,130,246,0.5)",
            }}
          >
            {isLast ? "Finish →" : "Next →"}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
