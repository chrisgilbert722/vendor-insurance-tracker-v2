// components/charts/SeverityDistributionChart.js
import React, { useMemo } from "react";

/* Theme (matches your dashboard & other charts) */
const GP = {
  high: "#FF3B3B",
  medium: "#FF9800",
  low: "#00C27A",
  ink: "#0D1623",
  inkSoft: "#64748B",
  cardBg: "#FFFFFF",
  subtleBorder: "rgba(148, 163, 184, 0.35)",
  softShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
};

export default function SeverityDistributionChart({ policies = [] }) {
  // Compute severity buckets
  const counts = useMemo(() => {
    const result = { high: 0, medium: 0, low: 0 };

    for (const p of policies) {
      const daysLeft = (() => {
        if (!p.expiration_date) return null;
        const [mm, dd, yyyy] = p.expiration_date.split("/");
        const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
      })();

      if (daysLeft == null) continue;

      if (daysLeft < 0) result.high++;
      else if (daysLeft <= 30) result.high++;
      else if (daysLeft <= 90) result.medium++;
      else result.low++;
    }

    return result;
  }, [policies]);

  const total = counts.high + counts.medium + counts.low || 1;

  const percentHigh = Math.round((counts.high / total) * 100);
  const percentMed = Math.round((counts.medium / total) * 100);
  const percentLow = Math.round((counts.low / total) * 100);

  return (
    <div
      style={{
        background: GP.cardBg,
        borderRadius: 20,
        padding: 24,
        border: `1px solid ${GP.subtleBorder}`,
        boxShadow: GP.softShadow,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: GP.inkSoft,
          }}
        >
          Severity Distribution
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: GP.ink,
            marginTop: 4,
          }}
        >
          {total} total active certificates
        </div>

        <div style={{ fontSize: 12, color: GP.inkSoft, marginTop: 2 }}>
          Breakdown of overall risk exposure based on expiration windows
        </div>
      </div>

      {/* Chart Bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* High */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ color: GP.high, fontWeight: 600 }}>High Risk</span>
            <span style={{ fontSize: 13, color: GP.inkSoft }}>
              {counts.high} ({percentHigh}%)
            </span>
          </div>

          <div
            style={{
              height: 10,
              background: "rgba(255, 59, 59, 0.12)",
              borderRadius: 999,
            }}
          >
            <div
              style={{
                width: `${percentHigh}%`,
                height: "100%",
                background: GP.high,
                borderRadius: 999,
              }}
            ></div>
          </div>
        </div>

        {/* Medium */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ color: GP.medium, fontWeight: 600 }}>
              Moderate Risk
            </span>
            <span style={{ fontSize: 13, color: GP.inkSoft }}>
              {counts.medium} ({percentMed}%)
            </span>
          </div>

          <div
            style={{
              height: 10,
              background: "rgba(255, 152, 0, 0.12)",
              borderRadius: 999,
            }}
          >
            <div
              style={{
                width: `${percentMed}%`,
                height: "100%",
                background: GP.medium,
                borderRadius: 999,
              }}
            ></div>
          </div>
        </div>

        {/* Low */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span style={{ color: GP.low, fontWeight: 600 }}>Low Risk</span>
            <span style={{ fontSize: 13, color: GP.inkSoft }}>
              {counts.low} ({percentLow}%)
            </span>
          </div>

          <div
            style={{
              height: 10,
              background: "rgba(0, 194, 122, 0.12)",
              borderRadius: 999,
            }}
          >
            <div
              style={{
                width: `${percentLow}%`,
                height: "100%",
                background: GP.low,
                borderRadius: 999,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
