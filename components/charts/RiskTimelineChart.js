// components/charts/RiskTimelineChart.js
import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const GP = {
  primary: "#0057FF",
  accent: "#00E0FF",
  ink: "#0D1623",
  inkSoft: "#64748B",
  cardBg: "#FFFFFF",
  subtleBorder: "rgba(148, 163, 184, 0.35)",
  softShadow: "0 18px 45px rgba(15,23,42,0.08)",
};

/** Fake “risk history” — later we'll replace with real metrics */
const generateRiskHistory = (policies = []) => {
  if (!policies.length) {
    return [
      { month: "Jan", score: 60 },
      { month: "Feb", score: 63 },
      { month: "Mar", score: 67 },
      { month: "Apr", score: 70 },
      { month: "May", score: 74 },
      { month: "Jun", score: 78 },
    ];
  }

  // Aggregate risk scores by vendor-month in real version
  // This placeholder keeps your dashboard clean for now
  return [
    { month: "Jan", score: 58 },
    { month: "Feb", score: 62 },
    { month: "Mar", score: 66 },
    { month: "Apr", score: 71 },
    { month: "May", score: 75 },
    { month: "Jun", score: 82 },
  ];
};

function TimelineTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: "#0F172A",
        color: "#E5E7EB",
        padding: "8px 12px",
        borderRadius: 10,
        boxShadow: "0 16px 40px rgba(15,23,42,0.6)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div>Risk Score: <strong>{payload[0].value}</strong></div>
    </div>
  );
}

export default function RiskTimelineChart({ policies }) {
  const data = useMemo(() => generateRiskHistory(policies), [policies]);

  const latest = data[data.length - 1]?.score ?? 0;
  const start = data[0]?.score ?? 0;
  const delta = latest - start;

  return (
    <div
      style={{
        background: GP.cardBg,
        borderRadius: 20,
        boxShadow: GP.softShadow,
        border: `1px solid ${GP.subtleBorder}`,
        padding: 24,
        marginBottom: 40,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: GP.inkSoft,
            }}
          >
            Risk Timeline
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: GP.ink,
              marginTop: 4,
            }}
          >
            {latest}
          </div>

          <div style={{ fontSize: 12, color: GP.inkSoft }}>
            {delta >= 0 ? "↗ Improving" : "↘ Worsening"} ({delta >= 0 ? "+" : ""}{delta})
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(0,87,255,0.05)",
            border: "1px solid rgba(0,87,255,0.25)",
            color: GP.primary,
            fontWeight: 600,
            textTransform: "uppercase",
            height: 20,
            marginTop: 8,
          }}
        >
          Last 6 Months
        </span>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <defs>
              <linearGradient id="timelineLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={GP.primary} stopOpacity={0.25} />
                <stop offset="100%" stopColor={GP.accent} stopOpacity={0.95} />
              </linearGradient>

              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />

            <XAxis
              dataKey="month"
              tick={{ fill: GP.inkSoft, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: GP.inkSoft, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[30, 100]}
            />

            <Tooltip content={<TimelineTooltip />} />

            <Line
              type="monotone"
              dataKey="score"
              stroke="url(#timelineLine)"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                strokeWidth: 2,
                stroke: "#fff",
                fill: GP.primary,
                filter: "url(#glow)",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
