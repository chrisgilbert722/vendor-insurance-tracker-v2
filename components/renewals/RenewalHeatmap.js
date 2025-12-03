import { useEffect, useState } from "react";

const STATUS_COLORS = {
  overdue: "#fb718580",
  critical: "#facc1580",
  due_soon: "#38bdf880",
  pending: "#22c55e80",
  missing: "#47556980",
};

export default function RenewalHeatmap({ range = 90 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/renewals/expiring?range=${range}`);
        const json = await res.json();
        if (json.ok) setData(json.data);
      } catch (err) {
        console.error("Heatmap load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  if (loading) {
    return <div style={{ fontSize: 13, color: "#9ca3af" }}>Loading heatmap…</div>;
  }

  if (!data.length) {
    return <div style={{ fontSize: 13, color: "#9ca3af" }}>No expiring policies.</div>;
  }

  return (
    <div
      style={{
        marginTop: 20,
        padding: 20,
        borderRadius: 20,
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(148,163,184,0.3)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          fontSize: 16,
          color: "#38bdf8",
          marginBottom: 12,
        }}
      >
        Renewal Heatmap (Next {range} Days)
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
          gap: 10,
        }}
      >
        {data.map((p) => (
          <div
            key={p.policy_id}
            style={{
              padding: "8px 6px",
              borderRadius: 10,
              background: STATUS_COLORS[p.status] || STATUS_COLORS.pending,
              color: "#0f172a",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            <div>{p.vendor_name}</div>
            <div style={{ fontSize: 10, marginTop: 2 }}>{p.coverage_type}</div>
            <div style={{ fontSize: 10 }}>
              {new Date(p.expiration_date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
