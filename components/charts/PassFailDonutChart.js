// components/charts/PassFailDonutChart.js
// ============================================================
// PASS / WARN / FAIL — SYSTEM DISTRIBUTION DIAL
// ORG-SCOPED (NO DEMO DATA)
// Empty state for first-time users
// ============================================================

import { useEffect, useState } from "react";

/* ============================================================
   THEME TOKENS
============================================================ */

const COLORS = {
  pass: "#22c55e",
  warn: "#facc15",
  fail: "#fb7185",

  bg: "#020617",
  ringBg: "rgba(148,163,184,0.12)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
  border: "rgba(51,65,85,0.9)",
};

/* ============================================================
   GEOMETRY HELPERS
============================================================ */

const RADIUS = 78;
const STROKE = 14;
const CIRC = 2 * Math.PI * RADIUS;

/* ============================================================
   COMPONENT

   Props:
   - overview: Dashboard overview object with severityBreakdown

   Derives pass/warn/fail from:
   - pass = low severity alerts (or no alerts)
   - warn = medium/high severity
   - fail = critical severity

   NO DEMO DATA — shows empty state when no real data exists
============================================================ */

export default function PassFailDonutChart({ overview = {} }) {
  // Extract severity breakdown from overview
  const breakdown = overview?.severityBreakdown || {};

  // Map severity to pass/warn/fail
  // Pass = vendors with no critical/high issues
  // Warn = vendors with medium issues
  // Fail = vendors with critical issues
  const fail = (breakdown.critical || 0);
  const warn = (breakdown.high || 0) + (breakdown.medium || 0);
  const pass = (breakdown.low || 0);

  const total = pass + warn + fail;
  const hasData = total > 0;

  // Animation state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // EMPTY STATE — No data
  if (!hasData) {
    return (
      <div
        style={{
          borderRadius: 24,
          padding: 24,
          border: `1px solid ${COLORS.border}`,
          background:
            "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
          boxShadow:
            "0 0 40px rgba(0,0,0,0.65), inset 0 0 28px rgba(15,23,42,0.9)",
          transform: mounted ? "scale(1)" : "scale(0.96)",
          opacity: mounted ? 1 : 0,
          transition: "all 420ms ease-out",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: COLORS.textSoft,
              marginBottom: 6,
            }}
          >
            Pass / Warn / Fail
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.textMuted,
            }}
          >
            — Pass Rate
          </div>

          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            No vendors evaluated yet
          </div>
        </div>

        {/* EMPTY DIAL */}
        <div
          style={{
            position: "relative",
            width: 220,
            height: 220,
            margin: "0 auto 14px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx="110"
              cy="110"
              r={RADIUS}
              fill="none"
              stroke={COLORS.ringBg}
              strokeWidth={STROKE}
            />
          </svg>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>📊</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted, maxWidth: 100 }}>
              Upload COIs to see pass rate
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 18,
            fontSize: 12,
            marginTop: 4,
          }}
        >
          <LegendDot color={COLORS.pass} label="Pass" />
          <LegendDot color={COLORS.warn} label="Warn" />
          <LegendDot color={COLORS.fail} label="Fail" />
        </div>
      </div>
    );
  }

  const passPct = Math.round((pass / total) * 100);

  // Glow strength based on pass %
  const glowStrength = Math.min(0.9, Math.max(0.25, passPct / 100));

  // Segment proportions
  const passFrac = pass / total;
  const warnFrac = warn / total;
  const failFrac = fail / total;

  let acc = 0;

  const segments = [
    { key: "pass", frac: passFrac, color: COLORS.pass },
    { key: "warn", frac: warnFrac, color: COLORS.warn },
    { key: "fail", frac: failFrac, color: COLORS.fail },
  ].map((seg) => {
    const start = acc;
    acc += seg.frac;
    return {
      ...seg,
      start,
      length: seg.frac,
    };
  });

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 24,
        border: "1px solid rgba(148,163,184,0.35)",
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
        boxShadow:
          "0 0 40px rgba(0,0,0,0.65), inset 0 0 28px rgba(15,23,42,0.9)",
        transform: mounted ? "scale(1)" : "scale(0.96)",
        opacity: mounted ? 1 : 0,
        transition: "all 420ms ease-out",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: COLORS.textSoft,
            marginBottom: 6,
          }}
        >
          Pass / Warn / Fail
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            background:
              "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {passPct}% Pass Rate
        </div>

        <div style={{ fontSize: 12, color: COLORS.textSoft }}>
          {total} alerts evaluated
        </div>
      </div>

      {/* DIAL */}
      <div
        style={{
          position: "relative",
          width: 220,
          height: 220,
          margin: "0 auto 14px auto",
        }}
      >
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          style={{
            transform: "rotate(-90deg)",
          }}
        >
          {/* Background Ring */}
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke={COLORS.ringBg}
            strokeWidth={STROKE}
          />

          {/* Segments */}
          {segments.map((seg) => {
            if (seg.length <= 0) return null;

            return (
              <circle
                key={seg.key}
                cx="110"
                cy="110"
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={`${seg.length * CIRC} ${CIRC}`}
                strokeDashoffset={-seg.start * CIRC}
                strokeLinecap="round"
                style={{
                  filter:
                    seg.key === "pass"
                      ? `drop-shadow(0 0 ${
                          18 * glowStrength
                        }px ${seg.color})`
                      : `drop-shadow(0 0 8px ${seg.color})`,
                  transition: "all 600ms ease-out",
                }}
              />
            );
          })}
        </svg>

        {/* CENTER LABEL */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1,
            }}
          >
            {passPct}
          </div>
          <div
            style={{
              fontSize: 14,
              color: COLORS.textSoft,
              marginTop: 2,
            }}
          >
            /100
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.textSoft,
            }}
          >
            Overall Pass
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 18,
          fontSize: 12,
          marginTop: 4,
        }}
      >
        <LegendDot color={COLORS.pass} label="Pass" />
        <LegendDot color={COLORS.warn} label="Warn" />
        <LegendDot color={COLORS.fail} label="Fail" />
      </div>
    </div>
  );
}

/* ============================================================
   SUBCOMPONENTS
============================================================ */

function LegendDot({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      <span style={{ color: color }}>{label}</span>
    </div>
  );
}
