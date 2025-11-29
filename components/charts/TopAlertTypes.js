// components/charts/TopAlertTypes.js
import { useEffect, useState } from "react";

export default function TopAlertTypes({ orgId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/top-types?orgId=${orgId}`);
      const json = await res.json();
      if (json.ok) setItems(json.top || []);
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
        border: "1px solid rgba(250,204,21,0.3)",
        boxShadow: "0 0 25px rgba(250,204,21,0.15)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          color: "#facc15",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Top Alert Types
      </div>

      {loading ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 12 }}>
          No active alerts.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{}}>
              <div
                style={{
                  color: "#e5e7eb",
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                {item.type.replace(/_/g, " ")}
              </div>

              {/* GOLD BAR */}
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "rgba(55,65,81,0.6)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(item.count * 12, 100)}%`,
                    height: "100%",
                    background:
                      "linear-gradient(90deg,#facc15,#fbbf24,#f59e0b)",
                  }}
                />
              </div>

              <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                {item.count} alerts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
