// components/charts/PassFailDonutChart.js
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* Local theme matching dashboard */
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

// Demo snapshot — wire up real counts later
const demoSnapshot = [
  { name: "Pass", value: 6 },
  { name: "Warn", value: 2 },
  { name: "Fail", value: 1 },
];

const COLORS = [GP.green, GP.orange, GP.red];

function DonutTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const { name, value, percent } = payload[0];

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
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>
      <div>
        Vendors: <strong>{value}</strong>
      </div>
      <div>{(percent * 100).toFixed(1)}% of evaluated</div>
    </div>
  );
}

export default function PassFailDonutChart({ data = demoSnapshot }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const pass = data.find((d) => d.name === "Pass")?.value ?? 0;
  const passPercent = total ? Math.round((pass / total) * 100) : 0;

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
            Pass / Warn / Fail
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: GP.ink,
              marginBottom: 4,
            }}
          >
            {passPercent}% Pass Rate
          </div>
          <div style={{ fontSize: 12, color: GP.inkSoft }}>
            {total} vendors evaluated in this snapshot
          </div>
        </div>

        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background:
              passPercent >= 90
                ? "rgba(34, 197, 94, 0.08)"
                : passPercent >= 70
                ? "rgba(234, 179, 8, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
            border:
              passPercent >= 90
                ? "1px solid rgba(34, 197, 94, 0.3)"
                : passPercent >= 70
                ? "1px solid rgba(234, 179, 8, 0.4)"
                : "1px solid rgba(239, 68, 68, 0.4)",
            fontSize: 11,
            fontWeight: 600,
            color:
              passPercent >= 90
                ? "#15803D"
                : passPercent >= 70
                ? "#92400E"
                : "#B91C1C",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            whiteSpace: "nowrap",
          }}
        >
          {passPercent >= 90
            ? "Elite posture"
            : passPercent >= 70
            ? "Needs attention"
            : "High risk"}
        </div>
      </div>

      {/* Donut chart */}
      <div style={{ flex: 1, minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="#0F172A"
              strokeWidth={1}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{ filter: "drop-shadow(0 6px 18px rgba(15, 23, 42, 0.25))" }}
                />
              ))}
            </Pie>

            {/* Center label */}
            <foreignObject x="34%" y="40%" width="32%" height="32%">
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: GP.ink,
                    marginBottom: 2,
                  }}
                >
                  {passPercent}%
                </div>
                <div style={{ fontSize: 11, color: GP.inkSoft, textAlign: "center" }}>
                  Overall pass
                </div>
              </div>
            </foreignObject>

            <Tooltip content={<DonutTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              wrapperStyle={{
                fontSize: 11,
                color: GP.inkSoft,
                marginTop: 4,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
