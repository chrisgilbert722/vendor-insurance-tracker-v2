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
  const [previewItem, setPreviewItem] = useState(null);

  async function loadQueue() {
    if (!orgId) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/renewals/email-queue/list?orgId=${orgId}&status=${statusFilter}`
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load queue");
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || "Load failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [orgId, statusFilter]);

  async function handleRetry(id) {
    try {
      setActionLoadingId(id);
      const res = await fetch("/api/renewals/email-queue/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, orgId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Retry failed.");
      loadQueue();
    } catch (err) {
      setError(err.message || "Retry failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCancel(id) {
    try {
      setActionLoadingId(id);
      const res = await fetch("/api/renewals/email-queue/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, orgId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Cancel failed.");
      loadQueue();
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
      }}
    >
      {/* HEADER PANEL */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 32,
          padding: 24,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
          border: `1px solid ${GP.border}`,
          boxShadow: "0 0 60px rgba(15,23,42,0.95)",
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
          📬 Renewal Email Queue
        </h1>

        <p style={{ fontSize: 13, color: GP.soft, marginBottom: 16 }}>
          Monitor auto-generated vendor & broker emails. Retry, cancel, or
          preview any message.
        </p>

        {/* FILTER BAR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 12 }}>
            Org: <span style={{ color: GP.blue }}>{orgId || "—"}</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                background: GP.panel,
                color: GP.text,
                border: `1px solid ${GP.border}`,
                fontSize: 12,
              }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={loadQueue}
              disabled={loading}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${GP.blue}`,
                background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "white",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 12,
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
              padding: 10,
              borderRadius: 12,
              background: "rgba(127,29,29,0.7)",
              color: "#fecaca",
              border: "1px solid rgba(248,113,113,0.8)",
            }}
          >
            {error}
          </div>
        )}

        {/* TABLE */}
        <div
          style={{
            borderRadius: 20,
            overflow: "hidden",
            border: `1px solid ${GP.border}`,
            background: GP.panel,
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderCollapse: "separate",
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
                      padding: "10px 12px",
                      background: "#0f172a",
                      borderBottom: `1px solid ${GP.border}`,
                      color: GP.soft,
                      textAlign: "left",
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
                      padding: 12,
                      textAlign: "center",
                      color: GP.soft,
                    }}
                  >
                    Queue is empty.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const color =
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
                          "linear-gradient(90deg,rgba(15,23,42,0.97),rgba(15,23,42,0.93))",
                      }}
                    >
                      <td style={{ padding: "8px 12px" }}>
                        {item.to_email || "—"}
                      </td>

                      <td style={{ padding: "8px 12px" }}>{item.target}</td>

                      <td style={{ padding: "8px 12px" }}>{item.stage}</td>

                      <td
                        style={{
                          padding: "8px 12px",
                          color,
                          fontWeight: 700,
                        }}
                      >
                        {item.status.toUpperCase()}
                      </td>

                      <td style={{ padding: "8px 12px" }}>{item.attempts}</td>

                      <td style={{ padding: "8px 12px" }}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </td>

                      <td style={{ padding: "8px 12px" }}>
                        {item.last_attempt_at
                          ? new Date(item.last_attempt_at).toLocaleString()
                          : "—"}
                      </td>

                      <td
                        style={{
                          padding: "8px 12px",
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => setPreviewItem(item)}
                      >
                        {item.subject}
                      </td>

                      <td style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
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
                                  background: GP.panel,
                                  color: GP.yellow,
                                  fontSize: 11,
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
                                  background: GP.panel,
                                  color: GP.red,
                                  fontSize: 11,
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

      {/* PREVIEW MODAL */}
      {previewItem && (
        <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </div>
  );
}

/* -----------------------------
   PREVIEW MODAL COMPONENT
----------------------------- */
function PreviewModal({ item, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: "85vh",
          overflow: "auto",
          borderRadius: 18,
          padding: 24,
          background: "#0f172a",
          border: "1px solid rgba(148,163,184,0.4)",
          color: "#e5e7eb",
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 12, color: "#38bdf8" }}>
          Email Preview
        </h2>

        <div style={{ fontSize: 12, marginBottom: 12 }}>
          <strong>To:</strong> {item.to_email || "—"} <br />
          <strong>Target:</strong> {item.target} <br />
          <strong>Stage:</strong> {item.stage}
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.35)",
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          <strong>Subject:</strong> {item.subject}
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.4)",
            padding: 12,
            borderRadius: 10,
            fontSize: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {item.body}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 12,
            background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            color: "white",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
