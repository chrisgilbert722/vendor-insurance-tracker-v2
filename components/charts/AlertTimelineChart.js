// components/charts/AlertTimelineChart.js
import { useEffect, useState } from "react";

export default function AlertTimelineChart({ orgId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/timeline?orgId=${orgId}&days=30`);
      const json = await res.json();
      if (json.ok) setData(json.timeline || []);
      setLoading(false);
    }

    load();
  }, [orgId]);

  function handleDayClick(day) {
    if (!day) return;
    window.location.href = `/admin/alerts?date=${day}`;
  }

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 22,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(56,189,248,0.3)",
        boxShadow: "0 0 25px rgba(56,189,248,0.15)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          color: "#38bdf8",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Alert Timeline (30 Days)
      </div>

      {loading ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>
          Loading timeline…
        </div>
      ) : data.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>
          No alerts in last 30 days.
        </div>
      ) : (
        <div style={{ width: "100%", height: 140 }}>
          <svg width="100%" height="140" style={{ cursor: "pointer" }}>
            {/* Background grid */}
            {[20, 40, 60, 80, 100, 120].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="100%"
                y2={y}
                stroke="rgba(148,163,184,0.12)"
              />
            ))}

            {/* Timeline polyline */}
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
              points={data
                .map((d, i) => {
                  const x = (i / (data.length - 1)) * 100;
                  const y = 120 - Math.min(d.total * 5, 120);
                  return `${x}%,${y}`;
                })
                .join(" ")}
            />

            {/* Data points */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 120 - Math.min(d.total * 5, 120);

              return (
                <circle
                  key={i}
                  cx={`${x}%`}
                  cy={y}
                  r={hoverIndex === i ? 5 : 3}
                  fill={hoverIndex === i ? "#0ea5e9" : "#38bdf8"}
                  stroke="#0ea5e9"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={() => handleDayClick(d.date)}
                />
              );
            })}
          </svg>

          {hoverIndex !== null && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#9ca3af",
                textAlign: "center",
              }}
            >
              {data[hoverIndex].date} ·{" "}
              <span style={{ color: "#38bdf8", fontWeight: 600 }}>
                {data[hoverIndex].total} alerts
              </span>{" "}
              — click to view
            </div>
          )}
        </div>
      )}
    </div>
  );
}
