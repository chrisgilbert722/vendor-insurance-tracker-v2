// components/renewals/RenewalSlaWidget.js

import { useEffect, useState } from "react";

export default function RenewalSlaWidget({ orgId }) {
  const [buckets, setBuckets] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/renewals/sla?orgId=${orgId}`);
        const json = await res.json();
        if (json.ok) setBuckets(json.buckets);
      } catch (err) {
        console.error("RenewalSlaWidget error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  if (!orgId) return null;

  if (loading || !buckets) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: 14,
          border: "1px solid rgba(148,163,184,0.5)",
          background: "rgba(15,23,42,0.96)",
          fontSize: 13,
          color: "#9ca3af",
        }}
      >
        Loading renewal SLA…
      </div>
    );
  }

  const rows = [
    { label: "On Time (≥31d)", key: "on_time", color: "#22c55e" },
    { label: "Due Soon (8–30d)", key: "due_soon", color: "#38bdf8" },
    { label: "Critical (0–7d)", key: "critical", color: "#facc15" },
    { label: "Overdue (0–7d)", key: "overdue_0_7", color: "#fb7185" },
    { label: "Overdue (8–30d)", key: "overdue_8_30", color: "#f97316" },
    { label: "Overdue (31+d)", key: "overdue_31_plus", color: "#b91c1c" },
  ];

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        border: "1px solid rgba(148,163,184,0.5)",
        background: "rgba(15,23,42,0.96)",
        fontSize: 12,
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 8,
          color: "#9ca3af",
          fontWeight: 600,
        }}
      >
        Renewal SLA Snapshot
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td
                style={{
                  padding: "4px 4px",
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: r.color,
                    marginRight: 6,
                  }}
                />
                {r.label}
              </td>
              <td
                style={{
                  padding: "4px 4px",
                  fontSize: 12,
                  textAlign: "right",
                  color: "#e5e7eb",
                }}
              >
                {buckets[r.key] ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
