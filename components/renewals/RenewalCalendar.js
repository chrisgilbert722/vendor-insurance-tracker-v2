// components/renewals/RenewalCalendar.js
// ============================================================
// RENEWAL CALENDAR — ORG-SCOPED (NO DEMO DATA)
// Shows expiring policies grouped by date
// Empty state for first-time users
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const GP = {
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
  border: "rgba(51,65,85,0.9)",
};

function groupByDate(data = []) {
  const map = {};
  data.forEach((p) => {
    const key = new Date(p.expiration_date).toISOString().slice(0, 10);
    if (!map[key]) map[key] = [];
    map[key].push(p);
  });
  return map;
}

export default function RenewalCalendar({ range = 60 }) {
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
        console.error("RenewalCalendar error:", err);
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
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${GP.border}`,
          background: "rgba(15,23,42,0.96)",
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 10, color: "#38bdf8", fontWeight: 600 }}>
          Renewal Calendar (Next {range} Days)
        </div>
        <div style={{ fontSize: 13, color: GP.textSoft }}>Loading renewal calendar…</div>
      </div>
    );
  }

  // EMPTY STATE — No policies for this org
  if (!data.length) {
    return (
      <div
        style={{
          borderRadius: 16,
          padding: 16,
          border: `1px solid ${GP.border}`,
          background: "rgba(15,23,42,0.96)",
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 10, color: "#38bdf8", fontWeight: 600 }}>
          Renewal Calendar (Next {range} Days)
        </div>
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            background: "rgba(2,6,23,0.5)",
            border: "1px dashed rgba(51,65,85,0.6)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 6 }}>🗓️</div>
          <div style={{ fontSize: 13, color: GP.textMuted }}>
            Upload your first vendor COI to see upcoming renewals.
          </div>
        </div>
      </div>
    );
  }

  const grouped = groupByDate(data);
  const dates = Object.keys(grouped).sort();

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        border: "1px solid rgba(148,163,184,0.4)",
        background: "rgba(15,23,42,0.96)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          marginBottom: 10,
          color: "#38bdf8",
          fontWeight: 600,
        }}
      >
        Renewal Calendar (Next {range} Days)
      </div>
      <div
        style={{
          maxHeight: 260,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
        {dates.map((d) => (
          <div
            key={d}
            style={{
              marginBottom: 10,
              paddingBottom: 6,
              borderBottom: "1px solid rgba(51,65,85,0.8)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginBottom: 4,
                fontWeight: 600,
              }}
            >
              {new Date(d).toLocaleDateString()} ·{" "}
              {grouped[d].length} expiring
            </div>
            {grouped[d].map((p) => (
              <div
                key={p.policy_id}
                style={{
                  fontSize: 12,
                  color: "#e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{p.vendor_name}</span>
                <span style={{ color: "#9ca3af" }}>{p.coverage_type}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
