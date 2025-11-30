// pages/renewals/email-queue.js
// CINEMATIC V5 — Email Queue Admin + Preview Modal

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

/* ===========================
   THEME
=========================== */
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

/* ===========================
   MAIN PAGE COMPONENT
=========================== */
export default function EmailQueueAdminPage() {
  const { activeOrgId: orgId } = useOrg();

  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null); // modal state

  /* ===========================
     LOAD QUEUE ITEMS
  ============================ */
  async function loadQueue() {
    if (!orgId) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/renewals/email-queue/list?orgId=${orgId}&status=${statusFilter}`
      );

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Load failed");

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

  /* ===========================
     ACTION: RETRY EMAIL
  ============================ */
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
      if (!data.ok) throw new Error(data.error || "Retry failed");

      await loadQueue();
    } catch (err) {
      setError(err.message || "Retry failed.");
    } finally {
      setActionLoadingId(null);
    }
  }

  /* ===========================
     ACTION: CANCEL EMAIL
  ============================ */
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
      if (!data.ok) throw new Error(data.error || "Cancel failed");

      await loadQueue();
    } catch (err) {
      setError(err.message || "Cancel failed.");
    } finally {
      setActionLoadingId(null);
    }
  }
  /* ===========================
     PAGE LAYOUT
  ============================ */
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

      {/* MAIN PANEL */}
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
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#facc15,#fb7185,#0f172a)",
              boxShadow: "0 0 40px rgba(249,250,251,0.35)",
            }}
          >
            <span style={{ fontSize: 26 }}>📬</span>
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
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              Auto-Email Queue Management
            </h1>

            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: GP.soft,
                maxWidth: 700,
              }}
            >
              Track pending, sent, failed, and cancelled auto-renewal emails.  
              Inspect messages, retry failures, and monitor real-time automation health.
            </p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          {/* ORG */}
          <div style={{ fontSize: 12, color: GP.soft }}>
            Org ID: <span style={{ color: GP.text }}>{orgId || "—"}</span>
          </div>

          {/* FILTERS */}
          <div style={{ display: "flex", gap: 10 }}>
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

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(248,113,113,0.8)",
              background: "rgba(127,29,29,0.9)",
              color: "#fecaca",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}
        {/* ===========================
            QUEUE TABLE PANEL
        ============================ */}
        <div
          style={{
            borderRadius: 22,
            border: `1px solid ${GP.border}`,
            background: GP.panel,
            overflow: "hidden",
            boxShadow: "0 0 25px rgba(0,0,0,0.45)",
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderCollapse: "separate",
              borderSpacing: 0,
              color: GP.text,
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
                      padding: "12px 14px",
                      background: "#0f172a",
                      color: GP.soft,
                      borderBottom: `1px solid ${GP.border}`,
                      fontWeight: 700,
                      letterSpacing: 0.35,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ===========================
                TABLE BODY
            ============================ */}
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: 14,
                      textAlign: "center",
                      fontSize: 12,
                      color: GP.soft,
                    }}
                  >
                    No emails in the queue.
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
                          "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
                        transition: "0.15s ease",
                      }}
                    >
                      {/* TO EMAIL */}
                      <td style={{ padding: "10px 14px" }}>
                        {item.to_email || "—"}
                      </td>

                      {/* TARGET TYPE */}
                      <td style={{ padding: "10px 14px" }}>
                        {item.target}
                      </td>

                      {/* STAGE */}
                      <td style={{ padding: "10px 14px" }}>{item.stage}</td>

                      {/* STATUS */}
                      <td
                        style={{
                          padding: "10px 14px",
                          fontWeight: 700,
                          color: statusColor,
                        }}
                      >
                        {item.status.toUpperCase()}
                      </td>

                      {/* ATTEMPTS */}
                      <td style={{ padding: "10px 14px" }}>
                        {item.attempts}
                      </td>

                      {/* CREATED AT */}
                      <td style={{ padding: "10px 14px" }}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </td>

                      {/* LAST ATTEMPT */}
                      <td style={{ padding: "10px 14px" }}>
                        {item.last_attempt_at
                          ? new Date(item.last_attempt_at).toLocaleString()
                          : "—"}
                      </td>

                      {/* SUBJECT — ellipsis */}
                      <td
                        style={{
                          padding: "10px 14px",
                          maxWidth: 250,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={item.subject}
                      >
                        {item.subject}
                      </td>

                      {/* ACTION BUTTONS */}
                      <td
                        style={{
                          padding: "10px 14px",
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        {/* PREVIEW BUTTON — triggers modal in Section 4 */}
                        <button
                          onClick={() => setPreviewItem(item)}
                          style={buttonBase(GP.blue)}
                        >
                          Preview
                        </button>

                        {/* RETRY / CANCEL BUTTONS */}
                        {item.status !== "sent" &&
                          item.status !== "cancelled" && (
                            <>
                              <button
                                onClick={() => handleRetry(item.id)}
                                disabled={actionLoadingId === item.id}
                                style={buttonBase(GP.yellow)}
                              >
                                {actionLoadingId === item.id
                                  ? "Retrying…"
                                  : "Retry"}
                              </button>

                              <button
                                onClick={() => handleCancel(item.id)}
                                disabled={actionLoadingId === item.id}
                                style={buttonBase(GP.red)}
                              >
                                {actionLoadingId === item.id
                                  ? "Cancelling…"
                                  : "Cancel"}
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
      {/* ===========================
          EMAIL PREVIEW MODAL
      ============================ */}
      {previewItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
          }}
          onClick={() => setPreviewItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 620,
              maxHeight: "82vh",
              overflowY: "auto",
              borderRadius: 24,
              background: GP.panel,
              border: `1px solid ${GP.border}`,
              padding: 24,
              boxShadow:
                "0 0 55px rgba(0,0,0,0.7), 0 0 70px rgba(56,189,248,0.25)",
              color: GP.text,
            }}
          >
            {/* HEADER */}
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 12,
                color: GP.blue,
              }}
            >
              📬 Email Preview
            </div>

            {/* META INFO */}
            <div style={{ marginBottom: 14, fontSize: 12, color: GP.soft }}>
              <div>
                <strong>To:</strong> {previewItem.to_email || "—"}
              </div>
              <div>
                <strong>Target:</strong> {previewItem.target}
              </div>
              <div>
                <strong>Stage:</strong> {previewItem.stage}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span style={{ color: GP.blue }}>
                  {previewItem.status.toUpperCase()}
                </span>
              </div>
              <div style={{ marginTop: 6 }}>
                <strong>Created:</strong>{" "}
                {previewItem.created_at
                  ? new Date(previewItem.created_at).toLocaleString()
                  : "—"}
              </div>
            </div>

            {/* SUBJECT */}
            <div
              style={{
                marginBottom: 10,
                padding: "10px 14px",
                borderRadius: 12,
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${GP.border}`,
                fontWeight: 600,
                color: GP.text,
              }}
            >
              {previewItem.subject}
            </div>

            {/* EMAIL BODY */}
            <pre
              style={{
                whiteSpace: "pre-wrap",
                background: "rgba(0,0,0,0.25)",
                border: `1px solid ${GP.border}`,
                padding: 14,
                fontSize: 12,
                borderRadius: 12,
                color: GP.text,
                lineHeight: 1.45,
                maxHeight: 380,
                overflowY: "auto",
              }}
            >
{previewItem.body}
            </pre>

            {/* CLOSE BUTTON */}
            <button
              onClick={() => setPreviewItem(null)}
              style={{
                marginTop: 20,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                background:
                  "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e3a8a)",
                border: "none",
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
                      <td
                        style={{
                          padding: "8px 12px",
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        {/* PREVIEW BUTTON */}
                        <button
                          onClick={() => setPreviewItem(item)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: `1px solid ${GP.blue}`,
                            background: "rgba(15,23,42,0.9)",
                            color: GP.blue,
                            fontSize: 11,
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Preview
                        </button>

                        {/* RETRY + CANCEL */}
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
                                {actionLoadingId === item.id
                                  ? "Retrying…"
                                  : "Retry"}
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
                                {actionLoadingId === item.id
                                  ? "Canceling…"
                                  : "Cancel"}
                              </button>
                            </>
                          )}
                      </td>
                ))}
            </tbody>
          </table>
        </div>
      </div>  {/* END MAIN PANEL */}

      {/* FOOTER */}
      <div
        style={{
          marginTop: 30,
          textAlign: "center",
          fontSize: 12,
          color: GP.soft,
        }}
      >
        Renewal Engine V3 • Email Queue Management
      </div>

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={() => setPreviewItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 520,
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: 18,
              padding: 24,
              background: GP.panel,
              border: `1px solid ${GP.border}`,
              boxShadow:
                "0 0 50px rgba(0,0,0,0.6), 0 0 60px rgba(56,189,248,0.35)",
              color: GP.text,
              animation: "fadeIn 0.18s ease-out",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: GP.blue,
                marginBottom: 10,
              }}
            >
              Email Preview
            </h2>

            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: GP.soft,
              }}
            >
              <strong>To:</strong> {previewItem.to_email || "—"} <br />
              <strong>Stage:</strong> {previewItem.stage} <br />
              <strong>Target:</strong> {previewItem.target}
            </div>

            <div
              style={{
                marginBottom: 12,
                padding: 14,
                background: "rgba(0,0,0,0.35)",
                borderRadius: 10,
                border: `1px solid ${GP.border}`,
                fontSize: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              <strong>Subject:</strong> {previewItem.subject}
            </div>

            <div
              style={{
                padding: 14,
                background: "rgba(0,0,0,0.40)",
                borderRadius: 10,
                border: `1px solid ${GP.border}`,
                fontSize: 12,
                whiteSpace: "pre-wrap",
                maxHeight: 380,
                overflow: "auto",
              }}
            >
              {previewItem.body}
            </div>

            <button
              onClick={() => setPreviewItem(null)}
              style={{
                marginTop: 20,
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                border: "none",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>  {/* END PAGE WRAPPER */}
  );
}  // END COMPONENT

// =======================
//  CLEAN EOF — COMPLETE
// =======================
