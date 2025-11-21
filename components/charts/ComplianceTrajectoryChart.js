// components/charts/ComplianceTrajectoryChart.js
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* ===========================
   CINEMATIC V2 THEME
=========================== */
const GP = {
  bgPanel: "rgba(15,23,42,0.98)",
  bgDeep: "rgba(15,23,42,1)",
  border: "rgba(51,65,85,0.9)",
  glowBlue: "rgba(56,189,248,0.35)",
  glowPurple: "rgba(168,85,247,0.25)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  accentBlue: "#38bdf8",
  accentGreen: "#22c55e",
  accentPurple: "#a855f7",
};

/* ===========================
   TOOLTIP — Cinematic
=========================== */
function TrajectoryTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;

  return (
    <div
      style={{
        background: "rgba(2,6,23,0.95)",
        color: "#e5e7eb",
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(56,189,248,0.25)",
        boxShadow: "0 0 18px rgba(56,189,248,0.55)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: GP.accentBlue }}>
        {label}
      </div>
      <div>
        Score:{" "}
        <strong style={{ color: GP.accentGreen, fontWeight: 700 }}>
          {value}
        </strong>
      </div>
    </div>
  );
}

/* ===========================
   MAIN COMPONENT
=========================== */
export default function ComplianceTrajectoryChart({ data }) {
  const d = data || [
    { label: "Jan", score: 62 },
    { label: "Feb", score: 68 },
    { label: "Mar", score: 74 },
    { label: "Apr", score: 79 },
    { label: "May", score: 83 },
    { label: "Jun", score: 88 },
  ];

  const latest = d[d.length - 1]?.score ?? 0;
  const start = d[0]?.score ?? 0;
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
          0 0 40px rgba(0,0,0,0.7),
          0 0 60px ${GP.glowBlue},
          inset 0 0 25px rgba(0,0,0,0.45)
        `,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: GP.textSoft,
            marginBottom: 6,
          }}
        >
          Compliance Score Trajectory
        </div>

        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            background:
              "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginBottom: 2,
          }}
        >
          {latest}
        </div>

        <div style={{ fontSize: 12, color: GP.textSoft }}>
          {delta >= 0 ? "↗ Improving" : "↘ Declining"} (
          {delta >= 0 ? "+" : ""}
          {delta})
        </div>
      </div>

      {/* CHART */}
      <div style={{ flex: 1, minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
            <defs>
              {/* Line color */}
              <linearGradient id="trajectoryLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.1} />
              </linearGradient>

              {/* Glow under the line */}
              <linearGradient id="trajectoryGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.18)"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: GP.textSoft }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: GP.textSoft }}
              domain={[40, 100]}
            />

            <Tooltip content={<TrajectoryTooltip />} />

            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#trajectoryLine)"
              strokeWidth={3}
              dot={{ r: 3, strokeWidth: 1, stroke: "#ffffff" }}
              activeDot={{
                r: 6,
                stroke: GP.accentBlue,
                strokeWidth: 2,
                style: { filter: "drop-shadow(0 0 10px rgba(56,189,248,0.9))" },
              }}
            />

            {/* Glow beneath the line */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#trajectoryGlow)"
              strokeWidth={12}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
