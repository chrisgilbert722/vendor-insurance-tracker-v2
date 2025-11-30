// pages/renewals/email-queue.js

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(148,163,184,0.45)",
  text: "#e5e7eb",
  soft: "#9ca3af",
  red: "#fb7185",
  yellow: "#facc15",
  green: "#22c55e",
  blue: "#38bdf8",
};

export default function EmailQueueAdminPage() {
  const { activeOrgId: orgId } = useOrg();

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");

  async function loadQueue() {
    if (!orgId) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/renewals/email-queue/list?orgId=${orgId}&status=${statusFilter}`
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Load failed.");
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [orgId, statusFilter]);
  async function handleRetry(id) {
    if (!orgId) return;
    try {
      setActionLoadingId(id);
      setError("");

      const res = await fetch("/api/renewals/email-queue/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, orgId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Retry failed.");
      await loadQueue();
    } catch (err) {
      setError(err.message || "Retry failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(id) {
    if (!orgId) return;
    try {
      setActionLoadingId(id);
      setError("");

      const res = await fetch("/api/renewals/email-queue/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, orgId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Cancel failed.");
      await loadQueue();
    } catch (err) {
      setError(err.message || "Cancel failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
        color: GP.text,
        position: "relative",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -220,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1200,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.40), transparent 60%)",
          filter: "blur(140px)",
          pointerEvents: "none",
        }}
      />

      {/* PANEL */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 32,
          padding: 24,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
          border: `1px solid ${GP.border}`,
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            inset 0 0 20px rgba(15,23,42,0.9)
          `,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#facc15,#fb7185,#0f172a)",
              boxShadow: "0 0 40px rgba(248,250,252,0.4)",
            }}
          >
            <span style={{ fontSize: 22 }}>📬</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: GP.soft,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Renewal Engine V3
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: GP.blue,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Email Queue Admin
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              Renewal Email Queue
            </h1>

            <p
              style={{
                marginTop: 4,
                fontSize: 13,
                color: GP.soft,
              }}
            >
              Review, retry, and cancel auto-generated renewal emails for vendors
              and brokers. This is your audit trail and control panel.
            </p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 12, color: GP.soft }}>
            Org ID:{" "}
            <span style={{ color: GP.text }}>
              {orgId || "—"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.9)",
                color: GP.text,
                fontSize: 12,
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={loadQueue}
              disabled={loading}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${GP.blue}`,
                background:
                  "linear-gradient(90deg,#38bdf8,#0ea5e9,#1d4ed8)",
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 10,
              padding: 8,
              borderRadius: 10,
              border: "1px solid rgba(248,113,113,0.8)",
              background: "rgba(127,29,29,0.9)",
              fontSize: 12,
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        {/* TABLE */}
        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${GP.border}`,
            background: GP.panel,
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
                {[
                  "To",
                  "Target",
                  "Stage",
                  "Status",
                  "Attempts",
                  "Created",
                  "Last Attempt",
                  "Subject",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      background: "#0f172a",
                      color: GP.soft,
                      borderBottom: `1px solid ${GP.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: 10,
                      fontSize: 12,
                      color: GP.soft,
                      textAlign: "center",
                    }}
                  >
                    No emails in queue.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const statusColor =
                    item.status === "failed"
                      ? GP.red
                      : item.status === "sent"
                      ? GP.green
                      : item.status === "cancelled"
                      ? GP.soft
                      : GP.yellow;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        background:
                          "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                      }}
                    >
                      <td style={{ padding: "8px 12px" }}>
                        {item.to_email || "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>{item.target}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {item.stage}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          fontWeight: 600,
                          color: statusColor,
                        }}
                      >
                        {item.status.toUpperCase()}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {item.attempts}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {item.last_attempt_at
                          ? new Date(
                              item.last_attempt_at
                            ).toLocaleString()
                          : "—"}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.subject}
                      >
                        {item.subject}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          display: "flex",
                          gap: 6,
                        }}
                      >
                        {item.status !== "sent" &&
                          item.status !== "cancelled" && (
                            <>
                              <button
                                onClick={() => handleRetry(item.id)}
                                disabled={actionLoadingId === item.id}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  border: `1px solid ${GP.yellow}`,
                                  background: "rgba(15,23,42,0.9)",
                                  color: GP.yellow,
                                  fontSize: 11,
                                  cursor:
                                    actionLoadingId === item.id
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                Retry
                              </button>

                              <button
                                onClick={() => handleCancel(item.id)}
                                disabled={actionLoadingId === item.id}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 999,
                                  border: `1px solid ${GP.red}`,
                                  background: "rgba(15,23,42,0.9)",
                                  color: GP.red,
                                  fontSize: 11,
                                  cursor:
                                    actionLoadingId === item.id
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
