// pages/admin/vendor/[id]/profile.js
// Admin Vendor Profile — V4
// (UI layout preserved, now calling V5 engine behind /api/engine/run-v3)

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function AdminVendorProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  // Email state
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  // Rule Engine state (now V5 behind run-v3)
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineMessage, setEngineMessage] = useState("");

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/admin/vendor/overview?id=${id}`);
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error || "Failed to load vendor profile.");
        }

        setOverview(json);
      } catch (err) {
        console.error("[admin/vendor/profile] load error", err);
        setError(err.message || "Failed to load vendor profile.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);
  /* ============================================================
     EMAIL SENDER — calls /api/email/send
  ============================================================ */
  async function handleSendEmail(type) {
    if (!overview?.vendor) return;

    try {
      setEmailSending(true);
      setEmailMessage("");

      let payload = { vendorId: overview.vendor.id };

      switch (type) {
        case "request":
          payload.template = "upload-request";
          break;
        case "fix":
          payload.template = "fix-issues";
          payload.issues = overview.alerts || [];
          break;
        case "renewal":
          payload.template = "renewal-reminder";
          payload.expirationDate = overview.metrics?.expirationDate || null;
          break;
        default:
          throw new Error("Unknown email action.");
      }

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Email send failed");

      setEmailMessage(json.message || "Email sent successfully.");
    } catch (err) {
      console.error("[Admin.EmailSend] ERROR", err);
      setEmailMessage(err.message || "Failed to send email.");
    } finally {
      setEmailSending(false);
    }
  }

  /* ============================================================
     RUN RULE ENGINE V5 — calls /api/engine/run-v3
  ============================================================ */
  async function handleRunEngine() {
    if (!overview?.vendor || !overview?.org) return;

    try {
      setEngineRunning(true);
      setEngineMessage("");

      const res = await fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: overview.vendor.id,
          orgId: overview.org.id,
          dryRun: false,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Engine failed.");

      setEngineMessage(
        `Rule Engine V5 complete — ${json.failedCount} failing rule(s).`
      );

      // Refresh overview after engine run
      const updated = await fetch(
        `/api/admin/vendor/overview?id=${overview.vendor.id}`
      );
      const updatedJson = await updated.json();
      if (updatedJson.ok) {
        setOverview(updatedJson);
      }
    } catch (err) {
      console.error("[RunEngine ERROR]", err);
      setEngineMessage(err.message || "Failed to run Rule Engine V5.");
    } finally {
      setEngineRunning(false);
    }
  }

  /* ============================================================
     LOADING + ERROR UI
  ============================================================ */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: GP.bg,
          color: GP.textSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
        }}
      >
        Loading vendor profile…
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: GP.bg,
          color: GP.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 42, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 16 }}>
            {error || "Vendor profile not found."}
          </div>
        </div>
      </div>
    );
  }

  const {
    vendor,
    org,
    metrics,
    alerts,
    requirements,
    timeline,
    portalToken,
    documents = [],
  } = overview;

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const infoAlerts = alerts.filter(
    (a) => a.severity === "info" || !a.severity
  );
  return (
    <div
      style={{
        minHeight: "100vh",
        background: GP.bg,
        color: GP.text,
        padding: "28px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* LEFT SIDE OF HEADER */}
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.15,
                color: GP.textSoft,
              }}
            >
              Admin · Vendor Profile
            </div>

            <h1
              style={{
                margin: "4px 0 6px 0",
                fontSize: 26,
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {vendor?.name || vendor?.vendor_name || "Vendor"}
            </h1>

            <div style={{ fontSize: 13, color: GP.textSoft }}>
              Organization:{" "}
              <span style={{ color: "#e5e7eb" }}>
                {org?.name || "Unknown org"}
              </span>
            </div>

            {/* Portal Token */}
            {portalToken && (
              <div
                style={{ marginTop: 4, fontSize: 11, color: GP.textSoft }}
              >
                Portal token linked ·{" "}
                <code
                  style={{
                    background: "rgba(15,23,42,0.9)",
                    padding: "2px 6px",
                    borderRadius: 6,
                    border: `1px solid ${GP.border}`,
                  }}
                >
                  {portalToken}
                </code>
              </div>
            )}
          </div>

          {/* ⭐ RIGHT SIDE — CONTRACT REVIEW BUTTON */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <button
              onClick={() =>
                router.push(`/admin/contracts/review?vendorId=${vendor.id}`)
              }
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${GP.neonGreen}`,
                background: "rgba(15,23,42,0.9)",
                color: GP.neonGreen,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ⚖️ Review Contract (AI)
            </button>
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              minWidth: 120,
              padding: "6px 10px",
              borderRadius: 12,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.95)",
            }}
          >
            <div style={{ fontSize: 11, color: GP.textSoft }}>
              Total Alerts
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {metrics?.totalAlerts ?? alerts.length}
            </div>
          </div>

          <div
            style={{
              minWidth: 120,
              padding: "6px 10px",
              borderRadius: 12,
              border: "1px solid rgba(248,113,113,0.5)",
              background: "rgba(120,53,15,0.4)",
            }}
          >
            <div style={{ fontSize: 11, color: GP.textSoft }}>
              Critical / High
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {(metrics?.criticalAlerts ?? criticalAlerts.length) +
                (metrics?.highAlerts ?? highAlerts.length)}
            </div>
          </div>

          <div
            style={{
              minWidth: 140,
              padding: "6px 10px",
              borderRadius: 12,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.95)",
            }}
          >
            <div style={{ fontSize: 11, color: GP.textSoft }}>
              Coverage Req.
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {metrics?.coverageCount ?? requirements.length}
            </div>
          </div>

          <div
            style={{
              minWidth: 160,
              padding: "6px 10px",
              borderRadius: 12,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.95)",
            }}
          >
            <div style={{ fontSize: 11, color: GP.textSoft }}>
              Last Activity
            </div>
            <div style={{ fontSize: 12 }}>
              {formatDateTime(metrics?.lastActivity)}
            </div>
          </div>
        </div>
        {/* MAIN GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1.1fr)",
            gap: 20,
          }}
        >
          {/* LEFT COLUMN */}
          <div>
            {/* ALERTS PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15 }}>Alerts by Severity</h3>

                <div
                  style={{
                    fontSize: 11,
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <span style={{ color: GP.neonRed }}>
                    ● Critical: {criticalAlerts.length}
                  </span>
                  <span style={{ color: GP.neonGold }}>
                    ● High: {highAlerts.length}
                  </span>
                  <span style={{ color: GP.neonBlue }}>
                    ● Info: {infoAlerts.length}
                  </span>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div style={{ fontSize: 13, color: GP.textSoft }}>
                  No alerts for this vendor.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(220px,1fr))",
                    gap: 10,
                  }}
                >
                  {/* Critical */}
                  {criticalAlerts.map((a, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 12,
                        padding: 10,
                        border: "1px solid rgba(248,113,113,0.7)",
                        background: "rgba(127,29,29,0.35)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: GP.neonRed, fontWeight: 600 }}>
                        {a.label || a.code}
                      </div>
                      <div style={{ color: GP.textSoft }}>{a.message}</div>
                    </div>
                  ))}

                  {/* High */}
                  {highAlerts.map((a, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 12,
                        padding: 10,
                        border: "1px solid rgba(250,204,21,0.7)",
                        background: "rgba(120,53,15,0.35)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: GP.neonGold, fontWeight: 600 }}>
                        {a.label || a.code}
                      </div>
                      <div style={{ color: GP.textSoft }}>{a.message}</div>
                    </div>
                  ))}

                  {/* Info */}
                  {infoAlerts.map((a, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 12,
                        padding: 10,
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: "rgba(15,23,42,0.9)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ color: GP.neonBlue, fontWeight: 600 }}>
                        {a.label || a.code}
                      </div>
                      <div style={{ color: GP.textSoft }}>{a.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* REQUIREMENTS PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, marginBottom: 8 }}>
                Coverage Requirements
              </h3>

              {requirements.length === 0 ? (
                <div style={{ fontSize: 13, color: GP.textSoft }}>
                  No requirements configured.
                </div>
              ) : (
                <table style={{ width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 4px",
                          borderBottom: `1px solid ${GP.border}`,
                          color: GP.textSoft,
                        }}
                      >
                        Coverage
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 4px",
                          borderBottom: `1px solid ${GP.border}`,
                          color: GP.textSoft,
                        }}
                      >
                        Limit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.map((r, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "6px 4px" }}>{r.name}</td>
                        <td
                          style={{
                            padding: "6px 4px",
                            color: GP.neonGold,
                          }}
                        >
                          {r.limit || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* DOCUMENT INTELLIGENCE PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 15,
                  color: GP.neonBlue,
                }}
              >
                Document Intelligence
              </h3>

              {(!documents || documents.length === 0) ? (
                <div style={{ fontSize: 13, color: GP.textSoft }}>
                  No documents uploaded yet.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                    gap: 12,
                  }}
                >
                  {documents.map((doc) => {
                    const ai = doc.ai_json || {};
                    const summary = ai.summary || "No summary available.";
                    const normalized = ai.normalized || {};
                    const docType =
                      doc.document_type ||
                      doc.doc_type ||
                      "other";

                    const fileUrl = doc.file_url || doc.url || null;
                    const uploadedAt = doc.uploaded_at || doc.created_at || null;

                    let typeColor = GP.neonBlue;
                    if (docType === "contract") typeColor = GP.neonPurple;
                    else if (docType === "license") typeColor = GP.neonGreen;
                    else if (docType === "w9") typeColor = GP.neonGold;
                    else if (docType === "endorsement") typeColor = GP.neonRed;

                    return (
                      <div
                        key={doc.id}
                        style={{
                          borderRadius: 14,
                          padding: 12,
                          background: "rgba(2,6,23,0.9)",
                          border: "1px solid rgba(51,65,85,0.8)",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                          fontSize: 12,
                          color: GP.textSoft,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 6,
                            color: typeColor,
                          }}
                        >
                          {docType.toUpperCase()}
                        </div>

                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11,
                              color: GP.neonBlue,
                              textDecoration: "underline",
                              display: "inline-block",
                              marginBottom: 6,
                            }}
                          >
                            View Document →
                          </a>
                        )}

                        {/* AI SUMMARY */}
                        <div style={{ marginTop: 6, marginBottom: 6 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 12,
                              marginBottom: 4,
                              color: GP.neonGold,
                            }}
                          >
                            AI Summary
                          </div>
                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.35,
                              color: GP.textSoft,
                            }}
                          >
                            {summary}
                          </div>
                        </div>

                        {/* NORMALIZED FIELDS */}
                        {normalized && Object.keys(normalized).length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 12,
                                marginBottom: 4,
                                color: GP.neonGreen,
                              }}
                            >
                              Extracted Data
                            </div>

                            {Object.entries(normalized).map(([k, v]) => (
                              <div key={k} style={{ fontSize: 11 }}>
                                <strong style={{ color: GP.text }}>
                                  {k}:{" "}
                                </strong>
                                {typeof v === "object"
                                  ? JSON.stringify(v)
                                  : String(v)}
                              </div>
                            ))}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 11,
                            opacity: 0.7,
                          }}
                        >
                          Uploaded: {formatDateTime(uploadedAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* TIMELINE PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 15,
                }}
              >
                Activity Timeline
              </h3>

              {timeline.length === 0 ? (
                <div style={{ fontSize: 13, color: GP.textSoft }}>
                  No recorded activity for this vendor yet.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: 260,
                    overflowY: "auto",
                    paddingRight: 4,
                  }}
                >
                  {timeline.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: 10,
                        padding: 10,
                        borderRadius: 10,
                        background: "rgba(15,23,42,0.98)",
                        border: "1px solid rgba(148,163,184,0.4)",
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                          marginBottom: 2,
                          color:
                            item.severity === "critical"
                              ? GP.neonRed
                              : item.severity === "warning"
                              ? GP.neonGold
                              : GP.neonBlue,
                        }}
                      >
                        {item.action?.replace(/_/g, " ") || "Event"}
                      </div>

                      <div style={{ color: GP.textSoft }}>{item.message}</div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: GP.textSoft,
                          opacity: 0.7,
                        }}
                      >
                        {formatDateTime(item.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* COMPLIANCE SNAPSHOT PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 6,
                  fontSize: 15,
                }}
              >
                Compliance Snapshot
              </h3>

              <div
                style={{
                  fontSize: 13,
                  color: GP.textSoft,
                  lineHeight: 1.5,
                }}
              >
                {alerts.length === 0 ? (
                  <>
                    This vendor currently has{" "}
                    <strong style={{ color: GP.neonGreen }}>
                      no active alerts
                    </strong>
                    . Their compliance posture is good — review their COI for
                    final validation.
                  </>
                ) : (
                  <>
                    This vendor has{" "}
                    <strong style={{ color: GP.neonRed }}>
                      {criticalAlerts.length} critical
                    </strong>{" "}
                    and{" "}
                    <strong style={{ color: GP.neonGold }}>
                      {highAlerts.length} high severity
                    </strong>{" "}
                    alerts, plus{" "}
                    <strong style={{ color: GP.neonBlue }}>
                      {infoAlerts.length} informational items
                    </strong>
                    .<br />
                    Focus on critical and high items first to restore
                    compliance.
                  </>
                )}
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 12,
                  background: "rgba(15,23,42,0.98)",
                  border: "1px dashed rgba(148,163,184,0.7)",
                  fontSize: 12,
                  color: GP.textSoft,
                }}
              >
                <div
                  style={{
                    marginBottom: 6,
                    fontWeight: 600,
                    color: GP.neonBlue,
                  }}
                >
                  Suggested Review Order
                </div>

                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  <li>Fix all critical alerts immediately.</li>
                  <li>Resolve high-severity alerts next.</li>
                  <li>Verify coverage requirements match the COI.</li>
                  <li>Ensure the COI upload date is current.</li>
                </ol>
              </div>
            </div>

            {/* QUICK ACTIONS PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 15,
                }}
              >
                Quick Actions
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {/* Upload Request */}
                <button
                  type="button"
                  onClick={() => handleSendEmail("request")}
                  disabled={emailSending}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(59,130,246,0.8)",
                    background:
                      "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                    color: "#0b1120",
                    textAlign: "left",
                    cursor: emailSending ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  📩 Send Upload Request
                </button>

                {/* Fix Issues Email */}
                <button
                  type="button"
                  onClick={() => handleSendEmail("fix")}
                  disabled={emailSending}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(250,204,21,0.8)",
                    background: "rgba(250,204,21,0.15)",
                    color: GP.neonGold,
                    textAlign: "left",
                    cursor: emailSending ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  ⚠️ Send Fix Issues Email
                </button>

                {/* Renewal Reminder */}
                <button
                  type="button"
                  onClick={() => handleSendEmail("renewal")}
                  disabled={emailSending}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(22,163,74,0.8)",
                    background: "rgba(22,163,74,0.18)",
                    color: GP.neonGreen,
                    textAlign: "left",
                    cursor: emailSending ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  ⏰ Send Renewal Reminder
                </button>

                {/* Run Rule Engine */}
                <button
                  type="button"
                  onClick={handleRunEngine}
                  disabled={engineRunning}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(168,85,247,0.8)",
                    background: "rgba(168,85,247,0.18)",
                    color: "#c084fc",
                    textAlign: "left",
                    cursor: engineRunning ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  ⚙️ Run Rule Engine V5
                </button>
              </div>

              {(emailMessage || engineMessage) && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: GP.textSoft,
                  }}
                >
                  {emailMessage || engineMessage}
                </div>
              )}
            </div>

            {/* INTERNAL NOTES PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 15,
                }}
              >
                Internal Notes (Admin Only)
              </h3>

              <textarea
                rows={4}
                placeholder="Example: Approved exception for Auto Liability limit based on broker letter dated 1/20/2025…"
                style={{
                  width: "100%",
                  minHeight: 80,
                  maxHeight: 180,
                  resize: "vertical",
                  padding: 8,
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.98)",
                  color: GP.text,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
