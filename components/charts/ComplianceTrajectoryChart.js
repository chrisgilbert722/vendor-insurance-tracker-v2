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

/* Local theme (matches your GP look) */
const GP = {
  primary: "#0057FF",
  primaryDark: "#003BB3",
  accent1: "#00E0FF",
  accent2: "#8A2BFF",
  red: "#FF3B3B",
  orange: "#FF9800",
  yellow: "#FFC107",
  green: "#00C27A",
  ink: "#0D1623",
  inkSoft: "#64748B",
  cardBg: "#FFFFFF",
  subtleBorder: "rgba(148, 163, 184, 0.35)",
  softShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

// 🔮 Demo data — later you can swap this for real API data
const demoTrajectory = [
  { label: "Jan", score: 62 },
  { label: "Feb", score: 68 },
  { label: "Mar", score: 74 },
  { label: "Apr", score: 79 },
  { label: "May", score: 83 },
  { label: "Jun", score: 88 },
];

function TrajectoryTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;

  return (
    <div
      style={{
        background: "#0F172A",
        color: "#E5E7EB",
        padding: "8px 12px",
        borderRadius: 10,
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.6)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div>Compliance Score: <strong>{value}</strong></div>
    </div>
  );
}

export default function ComplianceTrajectoryChart({ data = demoTrajectory }) {
  const latestScore = data[data.length - 1]?.score ?? 0;
  const firstScore = data[0]?.score ?? 0;
  const delta = latestScore - firstScore;
  const improving = delta >= 0;

  return (
    <div
      style={{
        background: GP.cardBg,
        borderRadius: 20,
        boxShadow: GP.softShadow,
        border: `1px solid ${GP.subtleBorder}`,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: GP.inkSoft,
              marginBottom: 4,
            }}
          >
            Compliance Score Trajectory
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: GP.ink,
              marginBottom: 2,
            }}
          >
            {latestScore.toFixed(0)}
          </div>
          <div style={{ fontSize: 12, color: GP.inkSoft }}>
            {improving ? "↗ Improving vs. baseline" : "↘ Declining vs. baseline"}{" "}
            ({delta >= 0 ? "+" : ""}
            {delta.toFixed(1)} pts)
          </div>
        </div>

        <div
          style={{
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(0, 87, 255, 0.07)",
            border: `1px solid rgba(0, 87, 255, 0.25)`,
            color: GP.primaryDark,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          Last 6 Months
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="complianceLineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GP.primary} stopOpacity={0.9} />
                <stop offset="100%" stopColor={GP.accent2} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="complianceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GP.primary} stopOpacity={0.28} />
                <stop offset="100%" stopColor={GP.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.35)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: GP.inkSoft }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: GP.inkSoft }}
              domain={[40, 100]}
            />
            <Tooltip content={<TrajectoryTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#complianceLineGradient)"
              strokeWidth={3}
              dot={{ r: 3, strokeWidth: 1, stroke: "#FFFFFF" }}
              activeDot={{
                r: 5,
                style: { filter: "drop-shadow(0 0 8px rgba(37, 99, 235, 0.9))" },
              }}
            />
            {/* Fake area by using a wide, faint stroke */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#complianceAreaGradient)"
              strokeWidth={10}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
