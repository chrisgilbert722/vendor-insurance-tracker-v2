// pages/admin/vendor/[id]/profile.js
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

  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

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

  async function handleSendEmail(type) {
    // type: "request", "fix", "renewal"
    if (!overview?.vendor) return;
    try {
      setEmailSending(true);
      setEmailMessage("");

      // Placeholder — you can wire this to your real email API later.
      // For now we just simulate a success.
      await new Promise((resolve) => setTimeout(resolve, 600));

      setEmailMessage(
        type === "request"
          ? "Upload request email queued."
          : type === "fix"
          ? "Fix issues email queued."
          : "Renewal reminder email queued."
      );
    } catch (err) {
      console.error("[send email] error", err);
      setEmailMessage("Failed to queue email.");
    } finally {
      setEmailSending(false);
    }
  }

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
          <div style={{ fontSize: 16 }}>{error || "Vendor profile not found."}</div>
        </div>
      </div>
    );
  }

  const { vendor, org, metrics, alerts, requirements, timeline, portalToken } = overview;

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const highAlerts = alerts.filter((a) => a.severity === "high");
  const infoAlerts = alerts.filter((a) => a.severity === "info" || !a.severity);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: GP.bg,
        color: GP.text,
        padding: "28px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
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
                background: "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {vendor?.name || "Vendor"}
            </h1>
            <div style={{ fontSize: 13, color: GP.textSoft }}>
              Organization:{" "}
              <span style={{ color: "#e5e7eb" }}>
                {org?.name || "Unknown organization"}
              </span>
            </div>
            {portalToken && (
              <div style={{ marginTop: 4, fontSize: 11, color: GP.textSoft }}>
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

          {/* SUMMARY STATS */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignSelf: "flex-start",
              justifyContent: "flex-end",
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
              <div style={{ fontSize: 11, color: GP.textSoft, marginBottom: 2 }}>
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
                border: `1px solid rgba(248,113,113,0.5)`,
                background: "rgba(30,64,175,0.35)",
              }}
            >
              <div style={{ fontSize: 11, color: GP.textSoft, marginBottom: 2 }}>
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
              <div style={{ fontSize: 11, color: GP.textSoft, marginBottom: 2 }}>
                Coverage Requirements
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
              <div style={{ fontSize: 11, color: GP.textSoft, marginBottom: 2 }}>
                Last Activity
              </div>
              <div style={{ fontSize: 12 }}>
                {formatDateTime(metrics?.lastActivity)}
              </div>
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
          {/* LEFT COLUMN — Alerts, Requirements, Timeline */}
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
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15 }}>Alerts by Severity</h3>
                <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                  <span style={{ color: GP.neonRed }}>
                    ● Critical: {metrics?.criticalAlerts ?? criticalAlerts.length}
                  </span>
                  <span style={{ color: GP.neonGold }}>
                    ● High: {metrics?.highAlerts ?? highAlerts.length}
                  </span>
                  <span style={{ color: GP.neonBlue }}>
                    ● Info: {metrics?.infoAlerts ?? infoAlerts.length}
                  </span>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div style={{ fontSize: 13, color: GP.textSoft }}>
                  No alerts recorded for this vendor.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                    gap: 10,
                  }}
                >
                  {criticalAlerts.map((a, idx) => (
                    <div
                      key={`crit-${idx}`}
                      style={{
                        borderRadius: 12,
                        padding: 10,
                        border: "1px solid rgba(248,113,113,0.7)",
                        background: "rgba(127,29,29,0.35)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: GP.neonRed, marginBottom: 4 }}>
                        {a.label || a.code || "Critical Issue"}
                      </div>
                      <div style={{ color: GP.textSoft }}>{a.message}</div>
                    </div>
                  ))}
                  {highAlerts.map((a, idx) => (
                    <div
                      key={`high-${idx}`}
                      style={{
                        borderRadius: 12,
                        padding: 10,
                        border: "1px solid rgba(250,204,21,0.7)",
                        background: "rgba(120,53,15,0.35)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: GP.neonGold, marginBottom: 4 }}>
                        {a.label || a.code || "High Issue"}
                      </div>
                      <div style={{ color: GP.textSoft }}>{a.message}</div>
                    </div>
                  ))}
                  {infoAlerts.map((a, idx) => (
                    <div
                      key={`info-${idx}`}
                      style={{
                        borderRadius: 12,
                        padding: 10,
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: "rgba(15,23,42,0.9)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: GP.neonBlue, marginBottom: 4 }}>
                        {a.label || a.code || "Info"}
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
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>
                Coverage Requirements
              </h3>
              {requirements.length === 0 ? (
                <div style={{ fontSize: 13, color: GP.textSoft }}>
                  No coverage requirements configured for this organization.
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 4px",
                          borderBottom: `1px solid ${GP.border}`,
                          color: GP.textSoft,
                          fontWeight: 500,
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
                          fontWeight: 500,
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
                        <td style={{ padding: "6px 4px", color: GP.neonGold }}>
                          {r.limit || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* TIMELINE PANEL (ADMIN VIEW) */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>
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

          {/* RIGHT COLUMN — Admin AI-ish overview + Quick Actions */}
          <div>
            {/* HIGH-LEVEL ASSESSMENT PANEL */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
                marginBottom: 18,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 15 }}>
                Compliance Snapshot
              </h3>
              <div style={{ fontSize: 13, color: GP.textSoft, lineHeight: 1.5 }}>
                {alerts.length === 0 ? (
                  <>
                    This vendor currently has{" "}
                    <strong style={{ color: GP.neonGreen }}>no active alerts</strong>. Review
                    their coverage requirements and confirm the latest COI matches your
                    expectations.
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
                    . Start by resolving critical and high issues, then confirm all required
                    coverages and limits are present in the COI.
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
                <div style={{ marginBottom: 4, fontWeight: 500, color: GP.neonBlue }}>
                  Suggested Review Order
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  <li>Address all critical alerts (coverage gaps, missing endorsements).</li>
                  <li>Resolve high severity alerts (limits too low, expiring policies).</li>
                  <li>Confirm all required coverages and limits are met.</li>
                  <li>Ensure the latest COI upload date aligns with your internal standards.</li>
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
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>Quick Actions</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSendEmail("request")}
                  disabled={emailSending}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(59,130,246,0.8)",
                    background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                    color: "#0b1120",
                    cursor: emailSending ? "not-allowed" : "pointer",
                    textAlign: "left",
                  }}
                >
                  📩 Send Upload Request
                </button>
                <button
                  type="button"
                  onClick={() => handleSendEmail("fix")}
                  disabled={emailSending}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(250,204,21,0.8)",
                    background: "rgba(250,204,21,0.12)",
                    color: GP.neonGold,
                    cursor: emailSending ? "not-allowed" : "pointer",
                    textAlign: "left",
                  }}
                >
                  ⚠️ Send Fix Issues Email
                </button>
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
                    cursor: emailSending ? "not-allowed" : "pointer",
                    textAlign: "left",
                  }}
                >
                  ⏰ Send Renewal Reminder
                </button>
              </div>
              {emailMessage && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: GP.textSoft,
                  }}
                >
                  {emailMessage}
                </div>
              )}
            </div>

            {/* NOTES PANEL (for internal comments / future AI) */}
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.96)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>
                Internal Notes (Admin)
              </h3>
              <div
                style={{
                  fontSize: 12,
                  color: GP.textSoft,
                  marginBottom: 6,
                }}
              >
                Use this section to track any internal decisions about this vendor’s risk,
                exceptions, or approvals. (Hook this later into your own notes storage.)
              </div>
              <textarea
                rows={4}
                placeholder="Example: Approved exception for Auto Liability limit based on written endorsement dated..."
                style={{
                  width: "100%",
                  resize: "vertical",
                  minHeight: 80,
                  maxHeight: 180,
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
