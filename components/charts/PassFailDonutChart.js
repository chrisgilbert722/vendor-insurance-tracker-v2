// components/charts/PassFailDonutChart.js
import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

/* ===========================
   GLOBAL SCORE–ALIGNED THEME
=========================== */
const GP = {
  bg: "rgba(2,6,23,0.98)",
  ringBg: "#020617",

  pass: "#22c55e",
  warn: "#facc15",
  fail: "#fb7185",

  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

/* ===========================
   MAIN COMPONENT
=========================== */
export default function PassFailDonutChart({ data }) {
  const d =
    data || [
      { name: "Pass", value: 6 },
      { name: "Warn", value: 2 },
      { name: "Fail", value: 1 },
    ];

  const total = d.reduce((s, x) => s + x.value, 0);
  const pass = d.find((x) => x.name === "Pass")?.value ?? 0;
  const passPercent = total ? Math.round((pass / total) * 100) : 0;

  /* ---------------------------
     Micro animation trigger
  --------------------------- */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  /* ---------------------------
     Glow intensity scaling
  --------------------------- */
  const glowStrength =
    passPercent >= 90
      ? 0.9
      : passPercent >= 70
      ? 0.6
      : passPercent >= 50
      ? 0.4
      : 0.25;

  const COLORS = [GP.pass, GP.warn, GP.fail];

  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        borderRadius: 22,
        padding: 22,
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
        border: "1px solid rgba(148,163,184,0.35)",
        boxShadow: `
          0 0 40px rgba(56,189,248,0.12),
          inset 0 0 28px rgba(0,0,0,0.65)
        `,
        transform: mounted ? "scale(1)" : "scale(0.96)",
        opacity: mounted ? 1 : 0,
        transition: "all 220ms ease-out",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.18em",
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
              "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
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

      {/* RING */}
      <div style={{ position: "relative", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={d}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={78}
              outerRadius={108}
              strokeWidth={0}
              paddingAngle={3}
            >
              {d.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i]}
                  style={{
                    filter:
                      i === 0
                        ? `drop-shadow(0 0 ${
                            28 * glowStrength
                          }px rgba(34,197,94,${
                            glowStrength
                          }))`
                        : i === 1
                        ? "drop-shadow(0 0 10px rgba(250,204,21,0.35))"
                        : "drop-shadow(0 0 10px rgba(251,113,133,0.35))",
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* CENTER CORE — GLOBAL SCORE STYLE */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at top, #020617, #000)",
              boxShadow: `
                inset 0 0 30px rgba(0,0,0,0.9),
                0 0 ${30 * glowStrength}px rgba(34,197,94,${
                glowStrength * 0.9
              })
              `,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: GP.text,
                lineHeight: 1,
              }}
            >
              {passPercent}
            </div>
            <div
              style={{
                fontSize: 12,
                color: GP.textSoft,
                marginTop: 2,
              }}
            >
              /100
            </div>
            <div
              style={{
                fontSize: 11,
                color: GP.textSoft,
                letterSpacing: "0.12em",
                marginTop: 6,
              }}
            >
              OVERALL PASS
            </div>
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 18,
          marginTop: 12,
        }}
      >
        <Legend label="Fail" color={GP.fail} />
        <Legend label="Pass" color={GP.pass} />
        <Legend label="Warn" color={GP.warn} />
      </div>
    </div>
  );
}

/* ===========================
   LEGEND ITEM
=========================== */
function Legend({ label, color }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color,
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      {label}
    </div>
  );
}
