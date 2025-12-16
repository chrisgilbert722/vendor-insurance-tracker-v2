import { useEffect, useState } from "react";

export default function RenewalBacklog() {
  const [renewals, setRenewals] = useState([]); // always array
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/renewals/list");
        const json = await res.json();

        if (alive && json && json.ok && Array.isArray(json.data)) {
          setRenewals(json.data);
        } else if (alive) {
          setRenewals([]);
        }
      } catch (err) {
        console.error("[RenewalBacklog] load error:", err);
        if (alive) setRenewals([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const safeRenewals = Array.isArray(renewals) ? renewals : [];

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
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Loading renewals…
        </div>
      ) : safeRenewals.length === 0 ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          No expiring policies.
        </div>
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
            {safeRenewals.map((r) => {
              const risk = r?.risk || {};
              const exp = r?.expiration_date
                ? new Date(r.expiration_date)
                : null;

              return (
                <tr
                  key={r.policy_id}
                  style={{
                    background: "rgba(2,6,23,0.6)",
                    borderBottom: "1px solid rgba(148,163,184,0.2)",
                  }}
                >
                  <td style={cell}>{r.vendor_name || "—"}</td>
                  <td style={cell}>{r.coverage_type || "—"}</td>
                  <td style={cell}>
                    {exp && !isNaN(exp)
                      ? exp.toLocaleDateString()
                      : "—"}
                  </td>
                  <td style={cell}>{r.status || "—"}</td>
                  <td style={cell}>
                    {risk.label
                      ? `${risk.label} (${risk.score ?? "—"})`
                      : "—"}
                  </td>
                  <td style={cell}>{r.alertsCount ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ================== STYLES ================== */

const th = {
  textAlign: "left",
  paddingBottom: 6,
  borderBottom: "1px solid rgba(148,163,184,0.3)",
  color: "#9ca3af",
};

const cell = {
  padding: "6px 0",
  borderBottom: "1px solid rgba(148,163,184,0.15)",
};
