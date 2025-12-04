// components/kpis/AlertAgingKpis.js
import { useEffect, useState } from "react";

export default function AlertAgingKpis({ orgId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/aging?orgId=${orgId}`);
      const json = await res.json();
      if (json.ok) setData(json.aging);
      setLoading(false);
    }

    load();
  }, [orgId]);

  return (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        borderRadius: 22,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(239,68,68,0.3)",
        boxShadow: "0 0 25px rgba(239,68,68,0.15)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          color: "#fb7185",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Alert Aging KPIs
      </div>

      {loading || !data ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>Loading…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          <Kpi label="Oldest Alert" value={`${data.oldest} days`} color="#fb7185" />
          <Kpi label="Avg Age" value={`${data.avgAge} days`} color="#eab308" />
          <Kpi label="> 7 Days" value={data.over7} color="#38bdf8" />
          <Kpi label="> 30 Days" value={data.over30} color="#f472b6" />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${color}55`,
        background: "rgba(15,23,42,0.85)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 4,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
