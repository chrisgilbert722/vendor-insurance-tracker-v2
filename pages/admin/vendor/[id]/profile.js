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

  // Email sending state
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  // 📌 NEW: Rule Engine V3 state
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
        if (!json.ok) throw new Error(json.error || "Failed to load vendor profile.");

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
     UPDATED EMAIL SENDER — Now calls /api/email/send
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
     📌 NEW — RUN RULE ENGINE V3
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
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Engine failed.");

      setEngineMessage(
        `Rule Engine V3 complete — ${json.failedCount} failures detected.`
      );

      // 🔄 Refresh vendor profile after re-evaluation
      const updated = await fetch(`/api/admin/vendor/overview?id=${overview.vendor.id}`);
      const updatedJson = await updated.json();
      if (updatedJson.ok) setOverview(updatedJson);

    } catch (err) {
      console.error("[RunEngine ERROR]", err);
      setEngineMessage(err.message || "Failed to run Rule Engine V3.");
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
            {/* QUICK ACTIONS PANEL — EMAILS + RULE ENGINE */}
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
                Quick Actions
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
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
                    textAlign: "left",
                    cursor: emailSending ? "not-allowed" : "pointer",
                    fontSize: 13,
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
                    background: "rgba(250,204,21,0.15)",
                    color: GP.neonGold,
                    textAlign: "left",
                    cursor: emailSending ? "not-allowed" : "pointer",
                    fontSize: 13,
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
                    textAlign: "left",
                    cursor: emailSending ? "not-allowed" : "pointer",
                    fontSize: 13,
                  }}
                >
                  ⏰ Send Renewal Reminder
                </button>

                {/* 📌 NEW BUTTON — RUN RULE ENGINE V3 */}
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
                  ⚙️ Run Rule Engine V3
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
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>
                Internal Notes (Admin Only)
              </h3>
              <textarea
                rows={4}
                placeholder="Example: Approved exception for Auto Liability limit based on broker letter…"
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
