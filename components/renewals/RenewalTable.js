// components/renewals/RenewalTable.js

import { useEffect, useState } from "react";
import RenewalStageBadge from "./RenewalStageBadge";

/**
 * Props:
 *  orgId
 *  search
 *  stageFilter
 *  coverageFilter
 */
export default function RenewalTable({
  orgId,
  search = "",
  stageFilter = "all",
  coverageFilter = "all",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [escalateLoadingId, setEscalateLoadingId] = useState(null);
  const [escalateError, setEscalateError] = useState("");

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

  async function handleEscalate(row, actionType) {
    try {
      setEscalateLoadingId(`${row.id}-${actionType}`);
      setEscalateError("");

      const msgBase =
        actionType === "broker"
          ? `Request updated ${row.coverage_type} COI from broker.`
          : actionType === "vendor"
          ? `Remind vendor to upload renewed ${row.coverage_type} COI.`
          : `Flag this renewal internally for follow-up.`;

      await fetch("/api/renewals/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendorId: row.vendor_id,
          policyId: row.policy_id,
          actionType,
          message: msgBase,
        }),
      });
    } catch (err) {
      setEscalateError(err.message || "Escalation failed.");
    } finally {
      setEscalateLoadingId(null);
    }
  }
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
          !r.coverage_type
            .toLowerCase()
            .includes(coverageFilter.toLowerCase())
        ) {
          return false;
        }
      }

      return true;
    })
    // Sort by soonest days_left
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
      {escalateError && (
        <div
          style={{
            padding: 8,
            fontSize: 12,
            color: "#fecaca",
            background: "rgba(127,29,29,0.75)",
            borderBottom: "1px solid rgba(248,113,113,0.9)",
          }}
        >
          {escalateError}
        </div>
      )}

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
            {[
              "Vendor",
              "Coverage",
              "Expires",
              "Stage",
              "Days Left",
              "Actions",
            ].map((h) => (
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
            ))}
          </tr>
        </thead>

        <tbody>
          {filtered.map((r) => {
            const danger =
              r.days_left <= 3 || r.stage === 0 ? "#fb7185" : "#38bdf8";

            const btnBase = {
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.8)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              fontSize: 10,
              padding: "4px 8px",
              cursor: "pointer",
            };

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

                {/* ACTIONS */}
                <td
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <button
                    style={btnBase}
                    disabled={
                      escalateLoadingId === `${r.id}-broker`
                    }
                    onClick={() => handleEscalate(r, "broker")}
                  >
                    {escalateLoadingId === `${r.id}-broker`
                      ? "Broker…"
                      : "Broker"}
                  </button>
                  <button
                    style={btnBase}
                    disabled={
                      escalateLoadingId === `${r.id}-vendor`
                    }
                    onClick={() => handleEscalate(r, "vendor")}
                  >
                    {escalateLoadingId === `${r.id}-vendor`
                      ? "Vendor…"
                      : "Vendor"}
                  </button>
                  <button
                    style={btnBase}
                    disabled={
                      escalateLoadingId === `${r.id}-internal`
                    }
                    onClick={() => handleEscalate(r, "internal")}
                  >
                    {escalateLoadingId === `${r.id}-internal`
                      ? "Internal…"
                      : "Internal"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

