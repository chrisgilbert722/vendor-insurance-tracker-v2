// components/charts/RiskTimelineChart.js — ORG-SCOPED (NO DEMO DATA)
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ===========================
   CINEMATIC V2 THEME
=========================== */
const GP = {
  bgPanel: "rgba(15,23,42,0.98)",
  bgDeep: "rgba(2,6,23,0.95)",
  border: "rgba(51,65,85,0.9)",

  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",

  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGreen: "#22c55e",
  neonGold: "#facc15",

  glowBlue: "rgba(56,189,248,0.45)",
  glowPurple: "rgba(168,85,247,0.45)",
};

/* ===========================
   TOOLTIP — Cinematic V2
=========================== */
function TimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "rgba(2,6,23,0.95)",
        padding: "10px 14px",
        color: GP.text,
        borderRadius: 12,
        border: "1px solid rgba(56,189,248,0.35)",
        boxShadow: `0 0 18px ${GP.glowBlue}`,
        fontSize: 12,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 4,
          color: GP.neonBlue,
        }}
      >
        {label}
      </div>
      <div>
        Risk Score:{" "}
        <strong style={{ color: GP.neonGreen }}>{payload[0].value}</strong>
      </div>
    </div>
  );
}

/* ===========================
   MAIN COMPONENT

   Props:
   - data: Array of { month: string, score: number } from dashboard metrics API

   NO DEMO DATA — shows empty state when no real data exists
=========================== */
export default function RiskTimelineChart({ data }) {
  // Ensure data is an array
  const safeData = Array.isArray(data) ? data : [];

  // Filter out entries with no meaningful score (score of 100 with no alerts = no real data)
  const hasRealData = safeData.length > 0 && safeData.some(d => d.score !== 100);

  // EMPTY STATE — No data after org reset
  if (!hasRealData) {
    return (
      <div
        style={{
          borderRadius: 24,
          padding: 22,
          border: `1px solid ${GP.border}`,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          boxShadow: `
            0 0 40px rgba(0,0,0,0.75),
            0 0 60px ${GP.glowBlue},
            inset 0 0 20px rgba(0,0,0,0.55)
          `,
          marginBottom: 40,
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: GP.textSoft,
              marginBottom: 6,
            }}
          >
            Risk Timeline
          </div>

          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: GP.textMuted,
              marginBottom: 2,
            }}
          >
            —
          </div>

          <div style={{ fontSize: 12, color: GP.textMuted }}>
            No trend data yet
          </div>
        </div>

        {/* EMPTY CHART AREA */}
        <div
          style={{
            width: "100%",
            height: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            background: "rgba(2,6,23,0.5)",
            border: "1px dashed rgba(51,65,85,0.6)",
          }}
        >
          <div style={{ textAlign: "center", color: GP.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 13 }}>
              Risk timeline will appear after your first vendor is evaluated
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate trend from real data
  const latest = safeData[safeData.length - 1]?.score ?? 0;
  const start = safeData[0]?.score ?? 0;
  const delta = latest - start;

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 22,
        border: `1px solid ${GP.border}`,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        boxShadow: `
          0 0 40px rgba(0,0,0,0.75),
          0 0 60px ${GP.glowBlue},
          inset 0 0 20px rgba(0,0,0,0.55)
        `,
        marginBottom: 40,
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: GP.textSoft,
            marginBottom: 6,
          }}
        >
          Risk Timeline
        </div>

        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            background:
              "linear-gradient(90deg,#38bdf8,#a855f7,#fb7185,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginBottom: 2,
          }}
        >
          {latest}
        </div>

        <div style={{ fontSize: 12, color: GP.textSoft }}>
          {delta > 0 ? "↗ Improving" : delta < 0 ? "↘ Worsening" : "→ Stable"} (
          {delta >= 0 ? "+" : ""}
          {delta})
        </div>
      </div>

      {/* CHART */}
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={safeData}>
            <defs>
              <linearGradient id="riskTimelineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={GP.neonBlue} stopOpacity={0.8} />
                <stop offset="50%" stopColor={GP.neonPurple} stopOpacity={0.9} />
                <stop offset="100%" stopColor={GP.neonGreen} stopOpacity={1} />
              </linearGradient>

              <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.16)"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              tick={{ fill: GP.textSoft, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              tick={{ fill: GP.textSoft, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
            />

            <Tooltip content={<TimelineTooltip />} />

            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#riskTimelineGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                strokeWidth: 2,
                stroke: GP.neonBlue,
                fill: GP.neonBlue,
                filter: "url(#dotGlow)",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
