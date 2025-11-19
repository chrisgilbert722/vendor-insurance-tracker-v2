// components/charts/ExpiringCertsHeatmap.js
import React, { useMemo } from "react";

/* Local theme matching dashboard / other charts */
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

/**
 * Parse "MM/DD/YYYY" into a normalized ISO date string (YYYY-MM-DD)
 */
function parseExpirationToISO(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy) return null;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Build 6 weeks (42 days) worth of dates starting today
 */
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

function intensityForCount(count) {
  if (count <= 0) {
    return {
      background: "rgba(148, 163, 184, 0.06)",
      border: "1px solid rgba(148, 163, 184, 0.25)",
    };
  }
  if (count === 1) {
    return {
      background: "rgba(0, 87, 255, 0.18)",
      border: "1px solid rgba(0, 87, 255, 0.55)",
    };
  }
  if (count <= 3) {
    return {
      background: "rgba(0, 87, 255, 0.32)",
      border: "1px solid rgba(0, 87, 255, 0.7)",
    };
  }
  return {
    background:
      "linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(220, 38, 38, 0.95))",
    border: "1px solid rgba(15, 23, 42, 0.75)",
  };
}

export default function ExpiringCertsHeatmap({ policies = [] }) {
  const days = useMemo(() => buildDateRange(42), []);
  const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  // Build a map of expiration date -> count
  const countsByISO = useMemo(() => {
    const map = {};
    for (const p of policies) {
      const iso = parseExpirationToISO(p.expiration_date);
      if (!iso) continue;
      map[iso] = (map[iso] || 0) + 1;
    }
    return map;
  }, [policies]);

  // Total expiring in range (for header)
  const totalExpiringInRange = useMemo(() => {
    return days.reduce((sum, d) => {
      const iso = d.toISOString().slice(0, 10);
      return sum + (countsByISO[iso] || 0);
    }, 0);
  }, [days, countsByISO]);

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 18,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: GP.inkSoft,
              marginBottom: 4,
            }}
          >
            Expiring Certificates Heatmap
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: GP.ink,
              marginBottom: 2,
            }}
          >
            {totalExpiringInRange} certificate
            {totalExpiringInRange === 1 ? "" : "s"} expiring next 6 weeks
          </div>
          <div style={{ fontSize: 12, color: GP.inkSoft }}>
            Darker tiles indicate heavier expiration clusters. Hover to inspect a day.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
            minWidth: 180,
          }}
        >
          <span
            style={{
              fontSize: 11,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(0, 87, 255, 0.05)",
              border: "1px solid rgba(0, 87, 255, 0.35)",
              color: GP.primaryDark,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Next 6 Weeks
          </span>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 11,
              color: GP.inkSoft,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: "rgba(148, 163, 184, 0.06)",
                  border: "1px solid rgba(148, 163, 184, 0.25)",
                }}
              />
              None
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: "rgba(0, 87, 255, 0.18)",
                  border: "1px solid rgba(0, 87, 255, 0.55)",
                }}
              />
              1
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: "rgba(0, 87, 255, 0.32)",
                  border: "1px solid rgba(0, 87, 255, 0.7)",
                }}
              />
              2–3
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background:
                    "linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(220, 38, 38, 0.95))",
                  border: "1px solid rgba(15, 23, 42, 0.75)",
                }}
              />
              4+
            </span>
          </div>
        </div>
      </div>

      {/* Weekday labels */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 6,
          fontSize: 11,
          color: GP.inkSoft,
          marginBottom: 6,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        {weekdayLabels.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Heatmap grid: 6 rows x 7 cols */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 6,
        }}
      >
        {days.map((d, idx) => {
          const iso = d.toISOString().slice(0, 10);
          const count = countsByISO[iso] || 0;
          const styles = intensityForCount(count);

          const dayOfMonth = d.getDate();
          const monthLabel =
            idx < 7 || dayOfMonth === 1
              ? d.toLocaleString(undefined, { month: "short" })
              : null;

          return (
            <div
              key={iso}
              title={`${d.toLocaleDateString()} — ${count} expiring`}
              style={{
                ...styles,
                borderRadius: 10,
                minHeight: 46,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "flex-start",
                boxShadow:
                  count >= 4
                    ? "0 0 0 1px rgba(15, 23, 42, 0.3), 0 18px 35px rgba(15, 23, 42, 0.4)"
                    : "none",
                color: count >= 4 ? "#F9FAFB" : GP.inkSoft,
                transition: "transform 0.12s ease-out, box-shadow 0.12s ease-out",
                cursor: count > 0 ? "pointer" : "default",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  opacity: 0.9,
                }}
              >
                {dayOfMonth}
              </div>
              {monthLabel && (
                <div
                  style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    opacity: 0.85,
                  }}
                >
                  {monthLabel}
                </div>
              )}
              {count > 0 && (
                <div
                  style={{
                    marginTop: "auto",
                    fontSize: 11,
                    fontWeight: 600,
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
