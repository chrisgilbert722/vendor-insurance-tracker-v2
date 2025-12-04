// components/kpis/SlaBreachWidget.js
import { useEffect, useState } from "react";

export default function SlaBreachWidget({ orgId }) {
  const [sla, setSla] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/sla?orgId=${orgId}`);
      const json = await res.json();
      if (json.ok) setSla(json.sla);
      setLoading(false);
    }

    load();
  }, [orgId]);

  const scoreColor =
    sla?.health >= 85
      ? "#22c55e"
      : sla?.health >= 60
      ? "#facc15"
      : sla?.health >= 40
      ? "#fb923c"
      : "#ef4444";

  return (
    <div
      style={{
        marginTop: 20,
        padding: 18,
        borderRadius: 22,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 0 25px rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          color: "#f87171",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        SLA Breach Indicator
      </div>

      {loading || !sla ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>Loading…</div>
      ) : (
        <>
          {/* SLA SCORE */}
          <div
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(30,41,59,0.7)",
              border: `1px solid ${scoreColor}55`,
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginBottom: 6,
                letterSpacing: "0.05em",
              }}
            >
              SLA Health
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                background: `linear-gradient(120deg,${scoreColor},#ffffff)`,
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {sla.health}
            </div>
          </div>

          {/* BREACH BREAKDOWN */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <SlaKpi
              label="> 24 hrs"
              value={sla.over24}
              color="#facc15"
            />
            <SlaKpi
              label="> 72 hrs"
              value={sla.over72}
              color="#fb923c"
            />
            <SlaKpi
              label="> 7 Days"
              value={sla.over7d}
              color="#ef4444"
            />
          </div>
        </>
      )}
    </div>
  );
}

function SlaKpi({ label, value, color }) {
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
