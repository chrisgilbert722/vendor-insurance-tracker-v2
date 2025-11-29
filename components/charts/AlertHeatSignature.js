// components/charts/AlertHeatSignature.js
import { useEffect, useState } from "react";

export default function AlertHeatSignature({ orgId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/heat-signature?orgId=${orgId}`);
      const json = await res.json();
      if (json.ok) setData(json.data || []);
      setLoading(false);
    }

    load();
  }, [orgId]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        borderRadius: 22,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(168,85,247,0.3)",
        boxShadow: "0 0 25px rgba(168,85,247,0.15)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          color: "#a855f7",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Alert Heat Signature
      </div>

      {loading ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>Loading…</div>
      ) : data.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>
          No alert activity in last 30 days.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${data.length}, 1fr)`,
            gap: 4,
            height: 80,
          }}
        >
          {data.map((d, i) => {
            const intensity = d.count / maxCount; // 0–1
            const color = `rgba(168,85,247,${0.15 + intensity * 0.85})`; // neon purple heat

            return (
              <div
                key={i}
                title={`${d.day}: ${d.count} alerts`}
                style={{
                  width: "100%",
                  height: "100%",
                  background: color,
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: intensity > 0.7 ? "0 0 10px #a855f7" : "none",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
