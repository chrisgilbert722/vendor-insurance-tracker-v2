// components/renewals/RenewalTable.js

import { useEffect, useState } from "react";
import RenewalStageBadge from "./RenewalStageBadge";

/**
 * Props:
 *  orgId          (required)
 *  search         (string)
 *  stageFilter    ("all" | "90" | "30" | "7" | "3" | "1" | "0")
 *  coverageFilter ("all" | coverage type)
 */
export default function RenewalTable({
  orgId,
  search = "",
  stageFilter = "all",
  coverageFilter = "all",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!orgId) return;

    async function load() {
      setLoading(true);

      const res = await fetch(`/api/renewals/list?orgId=${orgId}`);
      const data = await res.json();

      if (data.ok) setRows(data.rows || []);
      setLoading(false);
    }

    load();
  }, [orgId]);
  // Apply filters
  const filtered = rows
    .filter((r) => {
      // SEARCH filter (vendor name)
      if (search.trim()) {
        const needle = search.toLowerCase();
        if (!r.vendor_name.toLowerCase().includes(needle)) return false;
      }

      // STAGE filter
      if (stageFilter !== "all") {
        const stageNum = Number(stageFilter);
        if (r.stage !== stageNum) return false;
      }

      // COVERAGE filter
      if (coverageFilter !== "all") {
        if (
          !r.coverage_type ||
          !r.coverage_type.toLowerCase().includes(coverageFilter.toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    })
    // Sort by expiration date / days left
    .sort((a, b) => a.days_left - b.days_left);
  if (loading) {
    return (
      <div style={{ fontSize: 12, color: "#9ca3af", padding: 10 }}>
        Loading renewals…
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div
        style={{
          padding: 14,
          fontSize: 12,
          color: "#9ca3af",
          textAlign: "center",
        }}
      >
        No renewals match your filters.
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
                    padding: "10px 12px",
                    background: "rgba(15,23,42,1)",
                    color: "#9ca3af",
                    borderBottom: "1px solid rgba(51,65,85,0.9)",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {filtered.map((r) => {
            const danger =
              r.days_left <= 3 || r.stage === 0 ? "#fb7185" : "#38bdf8";

            return (
              <tr
                key={r.id}
                style={{
                  background:
                    "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
                  transition: "0.15s ease",
                }}
              >
                {/* VENDOR NAME */}
                <td style={{ padding: "10px 12px" }}>
                  <a
                    href={`/vendor/${r.vendor_id}`}
                    style={{
                      color: danger,
                      textDecoration: "none",
                      fontWeight: 600,
                    }}
                  >
                    {r.vendor_name}
                  </a>
                </td>

                {/* COVERAGE */}
                <td style={{ padding: "10px 12px", color: "#e5e7eb" }}>
                  {r.coverage_type}
                </td>

                {/* EXPIRATION */}
                <td style={{ padding: "10px 12px", color: "#e5e7eb" }}>
                  {r.expiration_date}
                </td>

                {/* STAGE BADGE */}
                <td style={{ padding: "10px 12px" }}>
                  <RenewalStageBadge stage={r.stage} />
                </td>

                {/* DAYS LEFT */}
                <td
                  style={{
                    padding: "10px 12px",
                    color:
                      r.days_left <= 3
                        ? "#fb7185"
                        : r.days_left <= 7
                        ? "#facc15"
                        : "#38bdf8",
                    fontWeight: 600,
                  }}
                >
                  {r.days_left}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
// END RenewalTable V4.5
