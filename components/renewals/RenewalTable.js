// components/renewals/RenewalTable.js
// CINEMATIC V4 — FULL CLEAN REBUILD

import { useEffect, useState } from "react";
import RenewalStageBadge from "./RenewalStageBadge";

// Neon theme
const GP = {
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(148,163,184,0.55)",
  soft: "#9ca3af",
  text: "#e5e7eb",
  blue: "#38bdf8",
  red: "#fb7185",
  yellow: "#facc15",
  green: "#22c55e",
};
 
export default function RenewalTable({
  orgId,
  search = "",
  stageFilter = "all",
  coverageFilter = "all",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESCALATION modal
  const [modal, setModal] = useState(null);

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
  /* ---------------- FILTERING ---------------- */
  const filtered = rows
    .filter((r) => {
      // SEARCH
      if (search.trim()) {
        const needle = search.toLowerCase();
        if (!r.vendor_name.toLowerCase().includes(needle)) return false;
      }

      // STAGE
      if (stageFilter !== "all") {
        if (Number(stageFilter) !== r.stage) return false;
      }

      // COVERAGE
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
    .sort((a, b) => a.days_left - b.days_left);
  /* ---------------- ESCALATE HANDLER ---------------- */
  async function handleEscalate(row, type) {
    // open modal
    setModal({
      type,
      vendor: row.vendor_name,
      coverage: row.coverage_type,
      vendor_id: row.vendor_id,
      policy_id: row.policy_id,
      stage: row.stage,
      days_left: row.days_left,
    });
  }
  /* ---------------- CINEMATIC AI MODAL ---------------- */
  if (modal) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.60)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
        }}
        onClick={() => setModal(null)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 520,
            maxHeight: "82vh",
            overflow: "auto",
            borderRadius: 18,
            padding: 24,
            background: GP.panel,
            border: `1px solid ${GP.border}`,
            color: GP.text,
            boxShadow:
              "0 0 50px rgba(0,0,0,0.7), 0 0 60px rgba(56,189,248,0.25)",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 14,
              color: GP.blue,
            }}
          >
            AI Escalation — {modal.vendor}
          </h2>

          <p style={{ fontSize: 13, color: GP.soft, marginBottom: 20 }}>
            Coverage: <strong>{modal.coverage}</strong>  
            <br />
            Stage: {modal.stage} • {modal.days_left} days left
          </p>

          {modal.type === "broker" && (
            <AIBlock text="Generate broker escalation email" endpoint="/api/renewals/escalate-ai" payload={modal} />
          )}

          {modal.type === "vendor" && (
            <AIBlock text="Generate vendor reminder email" endpoint="/api/renewals/escalate-ai" payload={modal} />
          )}

          {modal.type === "internal" && (
            <AIBlock text="Generate internal task summary" endpoint="/api/renewals/escalate-ai" payload={modal} />
          )}

          <button
            onClick={() => setModal(null)}
            style={{
              marginTop: 30,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 10,
              background:
                "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e3a8a)",
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }
  /* ---------------- AI BLOCK (INLINE COMPONENT) ---------------- */
  function AIBlock({ text, endpoint, payload }) {
    const [resp, setResp] = useState("");
    const [loading, setLoading] = useState(false);

    async function run() {
      setLoading(true);
      setResp("");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setResp(data.ai || "No result.");
      } else {
        setResp("AI error: " + data.error);
      }

      setLoading(false);
    }

    return (
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={run}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(56,189,248,0.25)",
            border: `1px solid ${GP.blue}`,
            color: GP.blue,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loading ? "Thinking…" : text}
        </button>

        {resp && (
          <pre
            style={{
              marginTop: 12,
              whiteSpace: "pre-wrap",
              background: "rgba(0,0,0,0.35)",
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${GP.border}`,
              fontSize: 11,
            }}
          >
            {resp}
          </pre>
        )}
      </div>
    );
  }
  /* ---------------- MAIN TABLE ---------------- */
  if (loading) {
    return (
      <div style={{ padding: 14, fontSize: 12, color: GP.soft }}>
        Loading renewals…
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div style={{ padding: 14, fontSize: 12, color: GP.soft }}>
        No renewals match your filters.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 24,
        background: GP.panel,
        border: `1px solid ${GP.border}`,
        overflow: "hidden",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: 12,
          color: GP.text,
        }}
      >
        <thead>
          <tr>
            {["Vendor", "Coverage", "Expires", "Stage", "Days", "Actions"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(15,23,42,1)",
                    borderBottom: `1px solid ${GP.border}`,
                    color: GP.soft,
                    fontWeight: 700,
                    textAlign: "left",
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr
              key={r.id}
              style={{
                background:
                  "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
              }}
            >
              <td style={{ padding: "10px 14px" }}>
                <a
                  href={`/vendor/${r.vendor_id}`}
                  style={{
                    color:
                      r.days_left <= 3
                        ? GP.red
                        : r.days_left <= 7
                        ? GP.yellow
                        : GP.blue,
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  {r.vendor_name}
                </a>
              </td>

              <td style={{ padding: "10px 14px" }}>{r.coverage_type}</td>
              <td style={{ padding: "10px 14px" }}>{r.expiration_date}</td>

              <td style={{ padding: "10px 14px" }}>
                <RenewalStageBadge stage={r.stage} />
              </td>

              <td
                style={{
                  padding: "10px 14px",
                  fontWeight: 700,
                  color:
                    r.days_left <= 3
                      ? GP.red
                      : r.days_left <= 7
                      ? GP.yellow
                      : GP.blue,
                }}
              >
                {r.days_left}
              </td>

              <td style={{ padding: "10px 14px", display: "flex", gap: 8 }}>
                <button
                  style={buttonStyle()}
                  onClick={() => handleEscalate(r, "broker")}
                >
                  Broker
                </button>
                <button
                  style={buttonStyle()}
                  onClick={() => handleEscalate(r, "vendor")}
                >
                  Vendor
                </button>
                <button
                  style={buttonStyle()}
                  onClick={() => handleEscalate(r, "internal")}
                >
                  Internal
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  function buttonStyle() {
    return {
      padding: "4px 10px",
      borderRadius: 999,
      border: `1px solid ${GP.border}`,
      background: "rgba(15,23,42,0.85)",
      color: GP.text,
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 600,
    };
  }
}

