// components/renewals/RenewalTable.js

import { useEffect, useState } from "react";
import RenewalStageBadge from "./RenewalStageBadge";

export default function RenewalTable({ orgId }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      const res = await fetch(`/api/renewals/list?orgId=${orgId}`);
      const data = await res.json();
      if (data.ok) setRows(data.rows || []);
    }

    load();
  }, [orgId]);

  if (!rows.length) {
    return (
      <div style={{ fontSize: 12, color: "#9ca3af" }}>
        No upcoming renewals.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 24,
        background: "rgba(15,23,42,0.98)",
        border: "1px solid rgba(148,163,184,0.4)",
        overflow: "hidden",
      }}
    >
      <table
        style={{
          width: "100%",
          fontSize: 12,
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            {["Vendor", "Coverage", "Expires", "Stage", "Days Left"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    background: "rgba(15,23,42,1)",
                    color: "#9ca3af",
                    borderBottom: "1px solid rgba(51,65,85,0.9)",
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              style={{
                background:
                  "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
              }}
            >
              <td style={{ padding: "8px 10px", color: "#e5e7eb" }}>
                <a
                  href={`/vendor/${r.vendor_id}`}
                  style={{ color: "#38bdf8", textDecoration: "none" }}
                >
                  {r.vendor_name}
                </a>
              </td>

              <td style={{ padding: "8px 10px", color: "#e5e7eb" }}>
                {r.coverage_type}
              </td>

              <td style={{ padding: "8px 10px", color: "#e5e7eb" }}>
                {r.expiration_date}
              </td>

              <td style={{ padding: "8px 10px" }}>
                <RenewalStageBadge stage={r.stage} />
              </td>

              <td style={{ padding: "8px 10px", color: "#facc15" }}>
                {r.days_left}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
