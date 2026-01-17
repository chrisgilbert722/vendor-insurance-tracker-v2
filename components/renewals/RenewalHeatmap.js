// components/renewals/RenewalHeatmap.js
// ============================================================
// RENEWAL HEATMAP — ORG-SCOPED (NO DEMO DATA)
// Shows expiring policies as colored tiles
// Empty state for first-time users
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const STATUS_COLORS = {
  overdue: "#fb718580",
  critical: "#facc1580",
  due_soon: "#38bdf880",
  pending: "#22c55e80",
  missing: "#47556980",
};

const GP = {
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
  border: "rgba(51,65,85,0.9)",
};

export default function RenewalHeatmap({ range = 90 }) {
  const { activeOrgId } = useOrg();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset when org changes
    setData([]);
    setLoading(true);

    if (!activeOrgId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/renewals/expiring?range=${range}&orgId=${activeOrgId}`);
        const json = await res.json();
        if (json.ok) setData(json.data || []);
      } catch (err) {
        console.error("Heatmap load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range, activeOrgId]);

  if (loading) {
    return (
      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 20,
          background: "rgba(15,23,42,0.95)",
          border: `1px solid ${GP.border}`,
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: 16, color: "#38bdf8", marginBottom: 12 }}>
          Renewal Heatmap (Next {range} Days)
        </h3>
        <div style={{ fontSize: 13, color: GP.textSoft }}>Loading heatmap…</div>
      </div>
    );
  }

  // EMPTY STATE — No policies for this org
  if (!data.length) {
    return (
      <div
        style={{
          marginTop: 20,
          padding: 20,
          borderRadius: 20,
          background: "rgba(15,23,42,0.95)",
          border: `1px solid ${GP.border}`,
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: 16, color: "#38bdf8", marginBottom: 12 }}>
          Renewal Heatmap (Next {range} Days)
        </h3>
        <div
          style={{
            padding: 24,
            borderRadius: 12,
            background: "rgba(2,6,23,0.5)",
            border: "1px dashed rgba(51,65,85,0.6)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
          <div style={{ fontSize: 13, color: GP.textMuted }}>
            Upload your first vendor COI to see upcoming renewals.
          </div>
        </div>
      </div>
    );
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
