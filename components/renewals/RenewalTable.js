// components/renewals/RenewalTable.js
// CINEMATIC RENEWAL TABLE V4.5 — AI Escalation + AI Emails + Insights

import { useEffect, useState } from "react";
import RenewalStageBadge from "./RenewalStageBadge";

const GP = {
  blue: "#38bdf8",
  red: "#fb7185",
  gold: "#facc15",
  green: "#22c55e",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(148,163,184,0.4)",
  soft: "#94a3b8",
  text: "#e5e7eb",
};

export default function RenewalTable({
  orgId,
  search = "",
  stageFilter = "all",
  coverageFilter = "all",
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [escalateLoadingId, setEscalateLoadingId] = useState(null);
  const [emailLoadingId, setEmailLoadingId] = useState(null);
  const [aiInsightLoadingId, setAiInsightLoadingId] = useState(null);

  const [modal, setModal] = useState(null); // { title, subject, body }

  const [error, setError] = useState("");

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
  /* =======================================================
     ESCALATE ACTION (broker / vendor / internal)
  ======================================================= */
  async function handleEscalate(row, actionType) {
    try {
      setEscalateLoadingId(`${row.id}-${actionType}`);
      setError("");

      const baseMsg =
        actionType === "broker"
          ? `Request updated ${row.coverage_type} COI from broker`
          : actionType === "vendor"
          ? `Remind vendor to upload renewed ${row.coverage_type} COI`
          : `Flag renewal internally`;

      await fetch("/api/renewals/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendorId: row.vendor_id,
          policyId: row.policy_id,
          actionType,
          message: baseMsg,
        }),
      });
    } catch (err) {
      setError(err.message || "Escalation failed.");
    } finally {
      setEscalateLoadingId(null);
    }
  }

  /* =======================================================
     AI EMAIL BUILDER (vendor / broker)
  ======================================================= */
  async function handleEmail(row, target) {
    try {
      setEmailLoadingId(`${row.id}-${target}`);
      setError("");

      const res = await fetch("/api/renewals/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendorName: row.vendor_name,
          coverage: row.coverage_type,
          stage: row.stage,
          daysLeft: row.days_left,
          expDate: row.expiration_date,
          target, // "vendor" | "broker"
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setModal({
        title: `AI Email (${target})`,
        subject: data.subject,
        body: data.body,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailLoadingId(null);
    }
  }

  /* =======================================================
     AI RENEWAL INSIGHT (“Why is this high risk?”)
  ======================================================= */
  async function handleInsight(row) {
    try {
      setAiInsightLoadingId(row.id);
      setError("");

      const res = await fetch("/api/renewals/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          coverage: row.coverage_type,
          vendor: row.vendor_name,
          stage: row.stage,
          daysLeft: row.days_left,
          expDate: row.expiration_date,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setModal({
        title: "AI Renewal Insight",
        subject: "",
        body: data.insight,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAiInsightLoadingId(null);
    }
  }
  /* =======================================================
     FILTERS
  ======================================================= */
  const filtered = rows
    .filter((r) => {
      if (search.trim()) {
        const needle = search.toLowerCase();
        if (!r.vendor_name.toLowerCase().includes(needle)) return false;
      }

      if (stageFilter !== "all") {
        if (r.stage !== Number(stageFilter)) return false;
      }

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

  if (loading) {
    return (
      <div style={{ color: GP.soft, padding: 12, fontSize: 12 }}>
        Loading renewals…
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 14,
          color: GP.soft,
          fontSize: 12,
        }}
      >
        No renewals match your filters.
      </div>
    );
  }
  return (
    <div
      style={{
        borderRadius: 22,
        background: GP.panel,
        border: `1px solid ${GP.border}`,
        overflow: "hidden",
      }}
    >
      {/* GLOBAL ERROR */}
      {error && (
        <div
          style={{
            padding: 10,
            fontSize: 12,
            color: "#fecaca",
            background: "rgba(127,29,29,0.75)",
            borderBottom: "1px solid rgba(248,113,113,0.9)",
          }}
        >
          {error}
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
              "Days",
              "Urgency",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "#0f172a",
                  color: GP.soft,
                  borderBottom: "1px solid rgba(51,65,85,0.8)",
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
              r.days_left <= 3 || r.stage === 0 ? GP.red : GP.blue;

            const btn = {
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.8)",
              background: "rgba(15,23,42,0.8)",
              color: GP.text,
              fontSize: 10,
              padding: "4px 8px",
              cursor: "pointer",
            };

            const loadingColor = GP.gold;

            return (
              <tr
                key={r.id}
                style={{
                  background:
                    "linear-gradient(90deg,rgba(15,23,42,0.96),rgba(15,23,42,0.92))",
                }}
              >
                {/* Vendor */}
                <td style={{ padding: "10px 12px" }}>
                  <a
                    href={`/vendor/${r.vendor_id}`}
                    style={{
                      color: danger,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {r.vendor_name}
                  </a>
                </td>

                {/* Coverage */}
                <td style={{ padding: "10px 12px", color: GP.text }}>
                  {r.coverage_type}
                </td>

                {/* Expires */}
                <td style={{ padding: "10px 12px", color: GP.text }}>
                  {r.expiration_date}
                </td>

                {/* Stage */}
                <td style={{ padding: "10px 12px" }}>
                  <RenewalStageBadge stage={r.stage} />
                </td>

                {/* Days Left */}
                <td
                  style={{
                    padding: "10px 12px",
                    color: danger,
                    fontWeight: 600,
                  }}
                >
                  {r.days_left}
                </td>

                {/* Urgency */}
                <td style={{ padding: "10px 12px" }}>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.05)",
                      overflow: "hidden",
                      width: 80,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(
                          100,
                          Math.max(0, 100 - r.days_left)
                        )}%`,
                        background:
                          r.days_left <= 3 ? GP.red : r.days_left <= 7 ? GP.gold : GP.blue,
                      }}
                    />
                  </div>
                </td>

                {/* ACTIONS */}
                <td
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  {/* Broker */}
                  <button
                    style={btn}
                    disabled={escalateLoadingId === `${r.id}-broker`}
                    onClick={() => handleEscalate(r, "broker")}
                  >
                    {escalateLoadingId === `${r.id}-broker`
                      ? "Broker…"
                      : "Broker"}
                  </button>

                  {/* Vendor */}
                  <button
                    style={btn}
                    disabled={escalateLoadingId === `${r.id}-vendor`}
                    onClick={() => handleEscalate(r, "vendor")}
                  >
                    {escalateLoadingId === `${r.id}-vendor`
                      ? "Vendor…"
                      : "Vendor"}
                  </button>

                  {/* Internal */}
                  <button
                    style={btn}
                    disabled={escalateLoadingId === `${r.id}-internal`}
                    onClick={() => handleEscalate(r, "internal")}
                  >
                    {escalateLoadingId === `${r.id}-internal`
                      ? "Internal…"
                      : "Internal"}
                  </button>

                  {/* AI Email Vendor */}
                  <button
                    style={btn}
                    disabled={emailLoadingId === `${r.id}-vendor`}
                    onClick={() => handleEmail(r, "vendor")}
                  >
                    {emailLoadingId === `${r.id}-vendor`
                      ? "Email…"
                      : "Email"}
                  </button>

                  {/* AI Insight */}
                  <button
                    style={btn}
                    disabled={aiInsightLoadingId === r.id}
                    onClick={() => handleInsight(r)}
                  >
                    {aiInsightLoadingId === r.id
                      ? "AI…"
                      : "AI"}
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
/* =======================================================
   CINEMATIC MODAL (AI Emails + Insights)
======================================================= */
if (modal) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={() => setModal(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxHeight: "80vh",
          overflow: "auto",
          borderRadius: 18,
          background: GP.panel,
          border: `1px solid ${GP.border}`,
          padding: 20,
          color: GP.text,
          boxShadow:
            "0 0 40px rgba(0,0,0,0.8), 0 0 60px rgba(56,189,248,0.35)",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 12,
            color: GP.blue,
          }}
        >
          {modal.title}
        </h2>

        {modal.subject && (
          <>
            <label style={{ fontSize: 12, color: GP.soft }}>Subject</label>
            <div
              style={{
                background: "rgba(0,0,0,0.25)",
                padding: 10,
                borderRadius: 6,
                marginBottom: 14,
                border: `1px solid ${GP.border}`,
              }}
            >
              {modal.subject}
            </div>
          </>
        )}

        <label style={{ fontSize: 12, color: GP.soft }}>Body</label>

        <pre
          style={{
            background: "rgba(0,0,0,0.25)",
            padding: 12,
            borderRadius: 6,
            border: `1px solid ${GP.border}`,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {modal.body}
        </pre>

        <button
          onClick={() => setModal(null)}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            background:
              "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e3a8a)",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            fontSize: 14,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

