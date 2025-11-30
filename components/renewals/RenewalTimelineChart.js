// components/renewals/RenewalTimelineChart.js

import { useEffect, useState } from "react";

export default function RenewalTimelineChart({ orgId }) {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      const res = await fetch(`/api/renewals/list?orgId=${orgId}`);
      const data = await res.json();
      if (!data.ok) return;

      const sorted = (data.rows || []).slice().sort((a, b) => a.days_left - b.days_left);
      setPoints(sorted);
    }

    load();
  }, [orgId]);

  if (!points.length) {
    return (
      <div style={{ fontSize: 12, color: "#9ca3af" }}>
        No renewal data for timeline.
      </div>
    );
  }

  const maxDays = Math.max(...points.map((p) => p.days_left));
  const minDays = Math.min(...points.map((p) => p.days_left));

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 18,
        padding: 12,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Renewal Timeline (by days left)
      </div>
      <svg width="100%" height="80">
        {points.map((p, idx) => {
          const x = (idx / (points.length - 1 || 1)) * 100;
          const norm =
            maxDays === minDays
              ? 50
              : ((p.days_left - minDays) / (maxDays - minDays)) * 60 + 10;
          const y = 70 - norm;

          return (
            <circle
              key={p.id}
              cx={`${x}%`}
              cy={y}
              r="3"
              fill={p.days_left <= 3 ? "#fb7185" : "#38bdf8"}
            />
          );
        })}
      </svg>
    </div>
  );
}
