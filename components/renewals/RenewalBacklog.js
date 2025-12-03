import { useEffect, useState } from "react";

export default function RenewalBacklog() {
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/renewals/list");
        const json = await res.json();
        if (json.ok) setRenewals(json.data);
      } catch (err) {
        console.error("Backlog load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div
      style={{
        marginTop: 30,
        padding: 20,
        background: "rgba(15,23,42,0.95)",
        borderRadius: 20,
        border: "1px solid rgba(148,163,184,0.3)",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom: 12,
          fontSize: 16,
          color: "#38bdf8",
        }}
      >
        Renewal Backlog
      </h3>

      {loading ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Loading renewals…</div>
      ) : renewals.length === 0 ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>No expiring policies.</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          <thead>
            <tr>
              <th style={th}>Vendor</th>
              <th style={th}>Coverage</th>
              <th style={th}>Expires</th>
              <th style={th}>Status</th>
              <th style={th}>Risk</th>
              <th style={th}>Alerts</th>
            </tr>
          </thead>

          <tbody>
            {renewals.map((r) => (
              <tr
                key={r.policy_id}
                style={{
                  background: "rgba(2,6,23,0.6)",
                  borderBottom: "1px solid rgba(148,163,184,0.2)",
                }}
              >
                <td style={td}>{r.vendor_name}</td>
                <td style={td}>{r.coverage_type}</td>
                <td style={td}>{new Date(r.expiration_date).toLocaleDateString()}</td>
                <td style={td}>{r.status}</td>
                <td style={td}>{r.risk.label} ({r.risk.score})</td>
                <td style={td}>{r.alertsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = {
  textAlign: "left",
  paddingBottom: 6,
  borderBottom: "1px solid rgba(148,163,184,0.3)",
  color: "#9ca3af",
};

const td = {
  padding: "6px 0",
  borderBottom: "1px solid rgba(148,163,184,0.15)",
};
