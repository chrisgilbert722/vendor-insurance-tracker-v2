// components/charts/SeverityDistributionChart.js — Cinematic V2
import React, { useMemo } from "react";

/* ===========================
   CINEMATIC V2 COLOR SYSTEM
=========================== */
const GP = {
  bgPanel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",

  text: "#e5e7eb",
  textSoft: "#9ca3af",

  high: "#fb7185",    // neon red
  med: "#facc15",     // neon yellow
  low: "#22c55e",     // neon green

  glowHigh: "rgba(251,113,133,0.45)",
  glowMed: "rgba(250,204,21,0.45)",
  glowLow: "rgba(34,197,94,0.45)",
};

/* ===========================
   MAIN COMPONENT
=========================== */
export default function SeverityDistributionChart({ policies = [] }) {
  // Compute severity category counts
  const counts = useMemo(() => {
    const result = { high: 0, medium: 0, low: 0 };

    for (const p of policies) {
      if (!p.expiration_date) continue;

      const [mm, dd, yyyy] = p.expiration_date.split("/");
      const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      const diff = Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));

      if (Number.isNaN(diff)) continue;

      if (diff < 0) result.high++;
      else if (diff <= 30) result.high++;
      else if (diff <= 90) result.medium++;
      else result.low++;
    }

    return result;
  }, [policies]);

  const total = counts.high + counts.medium + counts.low || 1;

  const pctHigh = Math.round((counts.high / total) * 100);
  const pctMed = Math.round((counts.medium / total) * 100);
  const pctLow = Math.round((counts.low / total) * 100);

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
          inset 0 0 20px rgba(0,0,0,0.45)
        `,
        marginBottom: 40,
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: GP.textSoft,
            marginBottom: 6,
          }}
        >
          Severity Distribution
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            background:
              "linear-gradient(90deg,#38bdf8,#a855f7,#fb7185,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginBottom: 2,
          }}
        >
          {total} Active Certificates Evaluated
        </div>

        <div style={{ fontSize: 12, color: GP.textSoft }}>
          Overall risk exposure across expiration windows.
        </div>
      </div>

      {/* BARS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* HIGH */}
        <SeverityBar
          label="High Risk"
          color={GP.high}
          glow={GP.glowHigh}
          pct={pctHigh}
          count={counts.high}
        />

        {/* MEDIUM */}
        <SeverityBar
          label="Moderate Risk"
          color={GP.med}
          glow={GP.glowMed}
          pct={pctMed}
          count={counts.medium}
        />

        {/* LOW */}
        <SeverityBar
          label="Low Risk"
          color={GP.low}
          glow={GP.glowLow}
          pct={pctLow}
          count={counts.low}
        />
      </div>
    </div>
  );
}

/* ===========================
   BAR COMPONENT (CINEMATIC)
=========================== */
function SeverityBar({ label, color, glow, pct, count }) {
  return (
    <div>
      {/* Title Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color,
            textShadow: `0 0 6px ${glow}`,
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize: 13,
            color: GP.textSoft,
          }}
        >
          {count} ({pct}%)
        </span>
      </div>

      {/* Bar Track */}
      <div
        style={{
          height: 14,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 16px ${glow}`,
          }}
        />
      </div>
    </div>
  );
}
