// components/charts/PassFailDonutChart.js
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ===========================
   CINEMATIC V3 THEME (LOCKED)
=========================== */
const GP = {
  bgPanel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",

  pass: "#22c55e",
  warn: "#facc15",
  fail: "#fb7185",

  glowPass: "rgba(34,197,94,0.35)",
  glowWarn: "rgba(250,204,21,0.35)",
  glowFail: "rgba(251,113,133,0.35)",
};

/* Tooltip (Cinematic) */
function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0];

  return (
    <div
      style={{
        background: "rgba(2,6,23,0.95)",
        border: "1px solid rgba(168,85,247,0.35)",
        boxShadow: "0 0 18px rgba(168,85,247,0.55)",
        color: GP.text,
        padding: "10px 14px",
        borderRadius: 12,
        fontSize: 12,
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 4,
          color:
            name === "Pass"
              ? GP.pass
              : name === "Warn"
              ? GP.warn
              : GP.fail,
        }}
      >
        {name}
      </div>
      <div>
        Vendors: <strong>{value}</strong>
      </div>
      <div style={{ color: GP.textSoft }}>
        {(percent * 100).toFixed(1)}% of evaluated
      </div>
    </div>
  );
}

export default function PassFailDonutChart({ data }) {
  const d =
    data || [
      { name: "Pass", value: 6 },
      { name: "Warn", value: 2 },
      { name: "Fail", value: 1 },
    ];

  const total = d.reduce((sum, x) => sum + x.value, 0);
  const pass = d.find((x) => x.name === "Pass")?.value ?? 0;
  const passPercent = total ? Math.round((pass / total) * 100) : 0;

  const COLORS = [GP.pass, GP.warn, GP.fail];

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 22,
        border: `1px solid ${GP.border}`,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        boxShadow:
          "0 0 40px rgba(0,0,0,0.7), inset 0 0 25px rgba(0,0,0,0.45)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: GP.textSoft,
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
              "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {passPercent}% Pass Rate
        </div>

        <div style={{ fontSize: 12, color: GP.textSoft }}>
          {total} vendors evaluated
        </div>
      </div>

      {/* CHART */}
      <div style={{ position: "relative", flex: 1, minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={d}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={96}
              strokeWidth={0}
              paddingAngle={4}
            >
              {d.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={COLORS[i]}
                  style={{
                    filter:
                      i === 0
                        ? `drop-shadow(0 0 14px ${GP.glowPass})`
                        : i === 1
                        ? `drop-shadow(0 0 14px ${GP.glowWarn})`
                        : `drop-shadow(0 0 14px ${GP.glowFail})`,
                  }}
                />
              ))}
            </Pie>

            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* PERFECT CENTER LABEL (OPTICAL) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -52%)", // 👈 optical centering fix
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#e5e7eb",
              lineHeight: 1,
            }}
          >
            {passPercent}%
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: GP.textSoft,
              letterSpacing: 0.4,
            }}
          >
            Overall Pass
          </div>
        </div>
      </div>

      {/* LEGEND (LOCKED + CENTERED) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 18,
          marginTop: 10,
        }}
      >
        <LegendItem label="Fail" color={GP.fail} />
        <LegendItem label="Pass" color={GP.pass} />
        <LegendItem label="Warn" color={GP.warn} />
      </div>
    </div>
  );
}

function LegendItem({ label, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: color,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 10px ${color}99`,
        }}
      />
      {label}
    </div>
  );
}
