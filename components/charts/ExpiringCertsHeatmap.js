// components/charts/ExpiringCertsHeatmap.js (Cinematic V2)
import React, { useMemo } from "react";

/* ===========================
   CINEMATIC V2 COLOR SYSTEM
=========================== */
const GP = {
  bgPanel: "rgba(15,23,42,0.98)",
  bgDeep: "rgba(2,6,23,0.95)",
  border: "rgba(51,65,85,0.9)",

  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",

  cool: "#38bdf8",     // neon cyan
  mid: "#a855f7",      // neon purple
  hot: "#fb7185",      // neon red
  whiteHot: "#facc15", // gold

  glowCool: "rgba(56,189,248,0.4)",
  glowMid: "rgba(168,85,247,0.4)",
  glowHot: "rgba(251,113,133,0.45)",
  glowWhite: "rgba(250,204,21,0.55)",
};

/* ===========================
   DATE HELPERS
=========================== */
function parseExpirationToISO(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function buildDateRange(days = 42) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const arr = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    arr.push(d);
  }
  return arr;
}

/* ===========================
   INTENSITY MAPPING (THE MAGIC)
   This is the cinematic hybrid: cold → mid → hot → white-hot
=========================== */
function cellStyle(count) {
  if (count <= 0) {
    return {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.05)",
      boxShadow: "none",
    };
  }

  if (count === 1) {
    return {
      background: "rgba(56,189,248,0.18)",
      border: "1px solid rgba(56,189,248,0.45)",
      boxShadow: `0 0 12px ${GP.glowCool}`,
    };
  }

  if (count === 2) {
    return {
      background: "rgba(168,85,247,0.22)",
      border: "1px solid rgba(168,85,247,0.55)",
      boxShadow: `0 0 16px ${GP.glowMid}`,
    };
  }

  if (count === 3) {
    return {
      background: "rgba(251,113,133,0.28)",
      border: "1px solid rgba(251,113,133,0.75)",
      boxShadow: `0 0 20px ${GP.glowHot}`,
    };
  }

  // 4+ = WHITE-HOT (maximum fear factor)
  return {
    background:
      "linear-gradient(135deg, rgba(250,204,21,0.85), rgba(251,113,133,0.8), rgba(168,85,247,0.85))",
    border: "1px solid rgba(250,204,21,0.9)",
    boxShadow: `
      0 0 25px ${GP.glowWhite},
      0 0 35px rgba(255,255,255,0.45)
    `,
  };
}

/* ===========================
   MAIN COMPONENT — CINEMATIC HEATMAP
=========================== */
export default function ExpiringCertsHeatmap({ policies = [] }) {
  const days = useMemo(() => buildDateRange(42), []);
  const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  // Map date -> count
  const countsByISO = useMemo(() => {
    const map = {};
    for (const p of policies) {
      const iso = parseExpirationToISO(p.expiration_date);
      if (iso) map[iso] = (map[iso] || 0) + 1;
    }
    return map;
  }, [policies]);

  const totalExpiringInRange = useMemo(
    () =>
      days.reduce((sum, d) => {
        const iso = d.toISOString().slice(0, 10);
        return sum + (countsByISO[iso] || 0);
      }, 0),
    [days, countsByISO]
  );

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 22,
        marginBottom: 40,
        border: `1px solid ${GP.border}`,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        boxShadow: `
          0 0 40px rgba(0,0,0,0.75),
          0 0 60px rgba(56,189,248,0.25),
          inset 0 0 20px rgba(0,0,0,0.55)
        `,
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
          Expiring Certificates Heatmap
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
          {totalExpiringInRange} expiring in next 6 weeks
        </div>

        <div style={{ fontSize: 12, color: GP.textSoft }}>
          Hover any day to inspect intensity.
        </div>
      </div>

      {/* WEEKDAY LABELS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: 6,
          fontSize: 11,
          color: GP.textSoft,
          marginBottom: 6,
          textAlign: "center",
        }}
      >
        {weekdayLabels.map((d) => (
          <div
            key={d}
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* HEATMAP GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
        }}
      >
        {days.map((d, idx) => {
          const iso = d.toISOString().slice(0, 10);
          const count = countsByISO[iso] || 0;
          const styles = cellStyle(count);

          const dayOfMonth = d.getDate();
          const showMonth =
            idx < 7 || dayOfMonth === 1
              ? d.toLocaleString("default", { month: "short" })
              : null;

          return (
            <div
              key={iso}
              title={`${d.toLocaleDateString()} — ${count} expiring`}
              style={{
                ...styles,
                borderRadius: 12,
                minHeight: 48,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: 6,
                transition:
                  "transform 0.15s ease-out, box-shadow 0.15s ease-out",
                cursor: count > 0 ? "pointer" : "default",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 600, color: GP.text }}>
                {dayOfMonth}
              </div>

              {showMonth && (
                <div
                  style={{
                    fontSize: 9,
                    color: GP.textSoft,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {showMonth}
                </div>
              )}

              {count > 0 && (
                <div
                  style={{
                    marginTop: "auto",
                    fontSize: 11,
                    fontWeight: 700,
                    color: GP.text,
                  }}
                >
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
